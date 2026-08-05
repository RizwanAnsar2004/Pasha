// The hardcoded extras at the bottom of form-design.ts — the comparisons the
// admin config cannot express.
//
// Each of these used to live in two or three places at once (schema.ts,
// form-config.ts, DynamicField.tsx). These pin the behaviour to the one
// remaining definition, and check the property the UI depends on: `comparedTo`,
// so the live error is held until both sides have been touched.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { amount, runRules } from "../forms/form-design";

const run = (values: Record<string, unknown>) => runRules(values);
const first = (values: Record<string, unknown>) => run(values)[0];

describe("inertness", () => {
  it("no rules fire on an empty payload", () => assert.deepEqual(run({}), []));

  // A comparison is skipped when its fields are absent, so deleting a field in
  // /admin/forms simply retires the rules that referenced it.
  it("no rules fire on a form with none of the named fields", () =>
    assert.deepEqual(run({ some_other_field: "x" }), []));
});

describe("employee counts", () => {
  it("rejects female > total", () =>
    assert.equal(first({ total_employees: 50, female_employees: 9999 })?.path, "female_employees"));

  it("mirrors the error onto total, so it follows the field being edited", () =>
    assert.deepEqual(
      run({ total_employees: 50, female_employees: 9999 }).map((i) => i.path),
      ["female_employees", "total_employees"]
    ));

  it("accepts equal counts", () =>
    assert.deepEqual(run({ total_employees: 5, female_employees: 5 }), []));

  it("ignores a partially filled pair", () => {
    assert.deepEqual(run({ female_employees: 5 }), []);
    assert.deepEqual(run({ total_employees: 5 }), []);
  });
});

describe("market sizing — TAM >= SAM >= SOM", () => {
  it("accepts a correctly nested set", () =>
    assert.deepEqual(run({ tam_amount: 1_000_000, sam_amount: 100_000, som_amount: 10_000 }), []));

  it("accepts equal figures (a startup may serve its whole market)", () =>
    assert.deepEqual(run({ tam_amount: 500, sam_amount: 500, som_amount: 500 }), []));

  it("rejects the exact reported inversion", () =>
    assert.equal(
      first({ tam_amount: 50_000, sam_amount: 200_000, som_amount: 500_000 })?.path,
      "sam_amount"
    ));

  it("rejects SOM > SAM when TAM is fine", () =>
    assert.equal(
      first({ tam_amount: 1_000_000, sam_amount: 10, som_amount: 5_000 })?.path,
      "som_amount"
    ));

  // The ref falls back to TAM when SAM is blank: with a gap in the middle the
  // inversion would otherwise go unchecked, and it is just as wrong.
  it("rejects SOM > TAM when SAM is blank", () =>
    assert.equal(first({ tam_amount: 100, som_amount: 900 })?.path, "som_amount"));

  it("accepts string values from a text-rendered field", () =>
    assert.deepEqual(run({ tam_amount: "1000", sam_amount: "500", som_amount: "100" }), []));

  it("rejects an inversion expressed as strings", () =>
    assert.equal(first({ tam_amount: "100", sam_amount: "500" })?.path, "sam_amount"));

  it("ignores partially filled sets", () => {
    assert.deepEqual(run({ tam_amount: 100 }), []);
    assert.deepEqual(run({ som_amount: 999_999 }), []);
  });

  it("treats unparseable and empty values as absent", () => {
    assert.equal(amount(""), null);
    assert.equal(amount("   "), null);
    assert.equal(amount("abc"), null);
    assert.equal(amount(NaN), null);
    assert.equal(amount(null), null);
    assert.deepEqual(run({ tam_amount: "abc", sam_amount: 5_000_000 }), []);
  });

  // The form holds the as-you-type error until both compared fields have been
  // blurred, and identifies the second through `comparedTo`. A wrong value here
  // means the live error either never appears or fires at someone still typing
  // the figure that resolves it.
  it("names the field each figure was measured against", () => {
    const pair = (v: Record<string, unknown>) => {
      const issue = first(v);
      assert.notEqual(issue, undefined);
      return [issue!.path, issue!.comparedTo];
    };
    assert.deepEqual(pair({ tam_amount: 50_000, sam_amount: 200_000 }), [
      "sam_amount",
      "tam_amount",
    ]);
    assert.deepEqual(pair({ tam_amount: 1_000_000, sam_amount: 10, som_amount: 5_000 }), [
      "som_amount",
      "sam_amount",
    ]);
    // SAM blank: SOM is compared against TAM instead, so that is what must be
    // waited on before the error shows.
    assert.deepEqual(pair({ tam_amount: 100, som_amount: 900 }), ["som_amount", "tam_amount"]);
  });

  it("explains why, using the market nouns", () =>
    assert.match(
      first({ tam_amount: 100, sam_amount: 500 })!.message,
      /serviceable market is a portion of the total addressable market/
    ));

  it("honours an admin-renamed label", () => {
    const issue = runRules(
      { tam_amount: 100, sam_amount: 500 },
      { tam_amount: "Total market", sam_amount: "Serviceable market" }
    )[0];
    assert.match(issue.message, /Serviceable market cannot be larger than Total market/);
  });
});

describe("year founded", () => {
  const thisYear = new Date().getFullYear();

  it("rejects a future year", () =>
    assert.equal(first({ year_founded: String(thisYear + 1) })?.path, "year_founded"));

  it("rejects a year before 1900", () =>
    assert.equal(first({ year_founded: "1500" })?.path, "year_founded"));

  it("accepts the current year", () =>
    assert.deepEqual(run({ year_founded: String(thisYear) }), []));

  it("leaves an empty value to the field's own schema", () =>
    assert.deepEqual(run({ year_founded: "" }), []));

  // The 4-digit shape is the admin's `pattern`, not this rule's job.
  it("leaves non-numeric text to the field's regex", () =>
    assert.deepEqual(run({ year_founded: "abcd" }), []));
});
