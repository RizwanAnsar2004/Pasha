// Submission-level behaviour of the config-built schema.
//
// Replaces the old schema.test.ts, which asserted against the hard-coded
// `submissionSchema`. That schema is gone — the form is defined entirely by the
// admin config — so these run against buildZodSchema(applicationConfig()),
// keeping the cases that were about behaviour rather than about that one file:
// founders rules, the city/country branch, "Other" capture, type coercion, and
// the injection-shaped strings.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildZodSchema } from "../forms/form-config";
import { founderSchema, foundersArray } from "../forms/form-design";
import { applicationConfig, validPayload } from "./fixtures/form-config";

const schema = buildZodSchema(applicationConfig());
const parse = (over: Record<string, unknown> = {}) =>
  schema.safeParse({ ...validPayload(), ...over });
const omit = (key: string) => {
  const v = validPayload();
  delete v[key];
  return schema.safeParse(v);
};

describe("happy path", () => {
  it("accepts the minimum valid payload", () => {
    const r = parse();
    assert.equal(r.success, true, JSON.stringify(!r.success && r.error.issues));
  });
});

describe("required fields fail when missing", () => {
  for (const key of ["startup_name", "website", "year_founded", "description", "primary_sector", "stage"]) {
    it(`${key} is required`, () => assert.equal(omit(key).success, false));
  }
});

describe("year_founded — admin regex plus the not-in-the-future rule", () => {
  // The 4-digit shape comes from the field's `pattern`; the upper bound is the
  // FORM_RULES half, because no regex can express "not after this year".
  it("rejects a future year", () => assert.equal(parse({ year_founded: "2099" }).success, false));
  it("rejects a year before 1900", () => assert.equal(parse({ year_founded: "1500" }).success, false));
  it("rejects non-year text", () => assert.equal(parse({ year_founded: "abcd" }).success, false));
  it("accepts a real year", () => assert.equal(parse({ year_founded: "2021" }).success, true));
});

describe("employee counts", () => {
  it("rejects female > total", () =>
    assert.equal(parse({ total_employees: 50, female_employees: 9999 }).success, false));
  it("accepts female <= total", () =>
    assert.equal(parse({ total_employees: 50, female_employees: 5 }).success, true));
  it("ignores the comparison when one side is blank", () =>
    assert.equal(parse({ female_employees: 5 }).success, true));
});

describe("market sizing", () => {
  it("rejects SAM > TAM", () =>
    assert.equal(parse({ tam_amount: 50_000, sam_amount: 200_000 }).success, false));
  it("accepts a correctly nested set", () =>
    assert.equal(
      parse({ tam_amount: 1_000_000, sam_amount: 100_000, som_amount: 10_000 }).success,
      true
    ));
});

describe("city / country branch", () => {
  it("requires a city when inside Pakistan", () =>
    assert.equal(parse({ hq_city: "", outside_pakistan: false }).success, false));
  it("requires a country when outside Pakistan", () =>
    assert.equal(parse({ hq_city: "", outside_pakistan: true }).success, false));
  it("accepts a country when outside Pakistan", () =>
    assert.equal(
      parse({ hq_city: "", outside_pakistan: true, hq_country: "United States" }).success,
      true
    ));
  it("requires the free text when the city is Other", () => {
    assert.equal(parse({ hq_city: "Other" }).success, false);
    assert.equal(parse({ hq_city: "Other", hq_other: "Bhakkar" }).success, true);
  });
});

describe('"Other" free-text capture', () => {
  it("requires the companion text when Other is picked", () =>
    assert.equal(parse({ primary_sector: "Other" }).success, false));
  it("accepts it once supplied", () =>
    assert.equal(
      parse({ primary_sector: "Other", primary_sector_other: "Quantum" }).success,
      true
    ));
  it("does not require it for a normal choice", () =>
    assert.equal(parse({ primary_sector: "ai" }).success, true));
});

describe("type coercion", () => {
  it("coerces boolean-ish strings for yes/no", () => {
    const r = parse({ is_pasha_member: "true" });
    assert.equal(r.success, true);
    if (r.success) assert.equal((r.data as Record<string, unknown>).is_pasha_member, true);
  });

  it("coerces numeric strings", () => {
    const r = parse({ total_employees: "12" });
    assert.equal(r.success, true);
    if (r.success) assert.equal((r.data as Record<string, unknown>).total_employees, 12);
  });

  it("rejects an array where a string is expected", () =>
    assert.equal(parse({ startup_name: ["Bear"] }).success, false));
});

describe("injection-shaped input is stored verbatim, never executed", () => {
  // These must PARSE — the schema is not a sanitiser. Escaping happens at
  // render (see safe-url.ts / sanitize-html.ts); silently rejecting them here
  // would reject legitimate names containing quotes or angle brackets.
  it("accepts an XSS-looking name", () =>
    assert.equal(parse({ startup_name: "<script>alert(1)</script>" }).success, true));
  it("accepts a SQL-looking name", () =>
    assert.equal(parse({ startup_name: "'; DROP TABLE submissions;--" }).success, true));
  it("accepts unicode and emoji", () =>
    assert.equal(parse({ startup_name: "بیئر پلیکس 🚀" }).success, true));
});

describe("description length bounds", () => {
  it("rejects under 50 characters", () =>
    assert.equal(parse({ description: "x".repeat(49) }).success, false));
  it("accepts exactly 50", () =>
    assert.equal(parse({ description: "x".repeat(50) }).success, true));
  it("rejects over 2000", () =>
    assert.equal(parse({ description: "x".repeat(2001) }).success, false));
});

describe("founders array", () => {
  const founder = (over: Record<string, unknown> = {}) => ({
    name: "Ayesha Khan",
    role: "CEO",
    email: "a@x.com",
    mobile: "03001234567",
    is_primary: true,
    ...over,
  });

  it("rejects an empty array", () =>
    assert.equal(foundersArray.safeParse([]).success, false));

  it("requires an email on the primary founder", () =>
    assert.equal(foundersArray.safeParse([founder({ email: "" })]).success, false));

  it("requires a mobile on the primary founder", () =>
    assert.equal(foundersArray.safeParse([founder({ mobile: "" })]).success, false));

  it("allows a secondary founder with neither", () =>
    assert.equal(
      foundersArray.safeParse([
        founder(),
        { name: "Bilal Ahmed", role: "CTO", is_primary: false },
      ]).success,
      true
    ));

  it("promotes the first founder when none is marked primary", () => {
    const r = foundersArray.safeParse([founder({ is_primary: false })]);
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data[0].is_primary, true);
  });

  it("rejects a custom link with a label but no URL", () =>
    assert.equal(
      founderSchema.safeParse(founder({ custom_links: [{ label: "GitHub", url: "" }] })).success,
      false
    ));

  it("drops a wholly empty custom-link row", () => {
    const r = founderSchema.safeParse(founder({ custom_links: [{ label: "", url: "" }] }));
    assert.equal(r.success, true);
    if (r.success) assert.deepEqual(r.data.custom_links, []);
  });
});

describe("founder name / role reject numeric-only input (BUG-17)", () => {
  const base = { name: "Ayesha Khan", role: "CEO" };
  const p = (over: Record<string, unknown>) => founderSchema.safeParse({ ...base, ...over });

  it("accepts an ordinary name and role", () => assert.equal(p({}).success, true));
  it("rejects the reported numeric string", () =>
    assert.equal(p({ name: "223232323223" }).success, false));
  it("rejects a numeric role", () => assert.equal(p({ role: "12345" }).success, false));
  it("rejects punctuation-only input", () => assert.equal(p({ name: "-- --" }).success, false));
  it("caps absurd lengths even with letters", () =>
    assert.equal(p({ name: "a".repeat(500) }).success, false));

  it("accepts non-Latin scripts", () => {
    assert.equal(p({ name: "عائشہ خان" }).success, true);
    assert.equal(p({ name: "李伟" }).success, true);
  });

  it("accepts digits or punctuation alongside letters", () => {
    assert.equal(p({ name: "O'Neill" }).success, true);
    assert.equal(p({ name: "Anne-Marie" }).success, true);
    assert.equal(p({ role: "Engineer L5" }).success, true);
  });
});
