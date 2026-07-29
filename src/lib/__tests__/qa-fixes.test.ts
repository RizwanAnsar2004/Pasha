// Tests for the QA-round fixes: URL/year/employee validation (#4), the
// Form Builder regex Pattern, and draft stripping of invalid values.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildZodSchema,
  stripInvalidDraftValues,
  type FormConfig,
  type FormFieldConfig,
} from "../forms/form-config";
import { SAFE_URL_RE } from "../forms/schema";
import { InputType } from "../forms/form-enums";

let n = 0;
function field(p: Partial<FormFieldConfig> & { field_key: string; input_type: number }): FormFieldConfig {
  return { id: `f${n++}`, label: p.field_key, required: false, validation: {}, visible: true, sort_order: 0, ...p };
}
function config(fields: FormFieldConfig[]): FormConfig {
  return [{ id: "s1", key: "s1", title: "S", subtitle: null, step: 1, sort_order: 0, is_active: true, fields }];
}
const ok = (schema: ReturnType<typeof buildZodSchema>, data: Record<string, unknown>) => schema.safeParse(data).success;

describe("#4 — SAFE_URL_RE rejects garbage, accepts real URLs", () => {
  it("rejects a host with no dot", () => assert.equal(SAFE_URL_RE.test("https://not-a-valid-url-at-all"), false));
  it("rejects javascript:", () => assert.equal(SAFE_URL_RE.test("javascript:alert(1)"), false));
  it("accepts a real domain", () => assert.equal(SAFE_URL_RE.test("https://lumenrobotics.io"), true));
  it("accepts path/query/port", () => assert.equal(SAFE_URL_RE.test("https://sub.domain.co.uk:8443/a?b=1#c"), true));

  it("dynamic URL field rejects the garbage value at submit", () => {
    const s = buildZodSchema(config([field({ field_key: "site", input_type: InputType.URL })]));
    assert.equal(ok(s, { site: "https://not-a-valid-url-at-all" }), false);
    assert.equal(ok(s, { site: "https://valid.com" }), true);
    assert.equal(ok(s, { site: "" }), true); // optional empty
  });
});

describe("#4 — year_founded bounds", () => {
  const s = buildZodSchema(config([field({ field_key: "year_founded", input_type: InputType.TEXT })]));
  it("rejects 9999", () => assert.equal(ok(s, { year_founded: "9999" }), false));
  it("rejects 1500 (before 1900)", () => assert.equal(ok(s, { year_founded: "1500" }), false));
  it("rejects non-year text", () => assert.equal(ok(s, { year_founded: "abcd" }), false));
  it("accepts a real year", () => assert.equal(ok(s, { year_founded: "2021" }), true));
  it("accepts empty (optional)", () => assert.equal(ok(s, { year_founded: "" }), true));
});

describe("#4 — female employees cannot exceed total", () => {
  const s = buildZodSchema(
    config([
      field({ field_key: "total_employees", input_type: InputType.NUMBER }),
      field({ field_key: "female_employees", input_type: InputType.NUMBER }),
    ])
  );
  it("rejects female > total", () => assert.equal(ok(s, { total_employees: "50", female_employees: "9999" }), false));
  it("accepts female <= total", () => assert.equal(ok(s, { total_employees: "50", female_employees: "5" }), true));
});

describe("Form Builder Pattern — regex enforced when non-empty, safe when malformed", () => {
  it("enforces a valid pattern", () => {
    const s = buildZodSchema(config([field({ field_key: "code", input_type: InputType.TEXT, validation: { pattern: "^[A-Z]{2}$" } })]));
    assert.equal(ok(s, { code: "AB" }), true);
    assert.equal(ok(s, { code: "abc" }), false);
    assert.equal(ok(s, { code: "" }), true); // empty optional skips the pattern
  });
  it("ignores a MALFORMED pattern instead of throwing", () => {
    const s = buildZodSchema(config([field({ field_key: "code", input_type: InputType.TEXT, validation: { pattern: "(" } })]));
    assert.equal(ok(s, { code: "anything" }), true); // bad admin pattern must not block
  });
});

describe("draft stripping — invalid values are not persisted", () => {
  const cfg = config([
    field({ field_key: "site", input_type: InputType.URL }),
    field({ field_key: "year_founded", input_type: InputType.TEXT }),
    field({ field_key: "code", input_type: InputType.TEXT, validation: { pattern: "^[A-Z]{2}$" } }),
    field({ field_key: "keep", input_type: InputType.TEXT }),
  ]);

  it("drops invalid, keeps valid + empty", () => {
    const cleaned = stripInvalidDraftValues(cfg, {
      site: "https://not-a-valid-url-at-all",
      year_founded: "9999",
      code: "abc",
      keep: "hello",
      empty: "",
    });
    assert.equal("site" in cleaned, false);
    assert.equal("year_founded" in cleaned, false);
    assert.equal("code" in cleaned, false);
    assert.equal(cleaned.keep, "hello");
    assert.equal(cleaned.empty, ""); // empty is left as-is
  });

  it("keeps all-valid values", () => {
    const cleaned = stripInvalidDraftValues(cfg, { site: "https://ok.com", year_founded: "2021", code: "AB" });
    assert.equal(cleaned.site, "https://ok.com");
    assert.equal(cleaned.year_founded, "2021");
    assert.equal(cleaned.code, "AB");
  });

  it("strips an invalid founder sub-field but keeps the rest", () => {
    const g = config([
      field({
        field_key: "founders",
        input_type: InputType.GROUP,
        repeatable: true,
        children: [field({ field_key: "name", input_type: InputType.TEXT }), field({ field_key: "email", input_type: InputType.EMAIL })],
      }),
    ]);
    const cleaned = stripInvalidDraftValues(g, { founders: [{ name: "Al", email: "not-an-email" }] });
    const f0 = (cleaned.founders as Record<string, unknown>[])[0];
    assert.equal("email" in f0, false);
    assert.equal(f0.name, "Al");

    const kept = stripInvalidDraftValues(g, { founders: [{ name: "Al", email: "al@x.com" }] });
    assert.equal((kept.founders as Record<string, unknown>[])[0].email, "al@x.com");
  });
});
