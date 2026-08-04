// Tests for the QA bug-report round: TAM/SAM/SOM ordering (BUG-02) and the
// founder name/role character-class rule (BUG-17).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { marketSizeIssue, marketAmount } from "../forms/market-size";
import { founderSchema } from "../forms/schema";

describe("BUG-02 — TAM/SAM/SOM ordering", () => {
  const ok = (v: Record<string, unknown>) => assert.equal(marketSizeIssue(v), null);
  const rejects = (v: Record<string, unknown>, field: string) => {
    const issue = marketSizeIssue(v);
    assert.notEqual(issue, null, `expected ${JSON.stringify(v)} to be rejected`);
    assert.equal(issue!.path[0], field);
  };

  it("accepts a correctly nested set", () =>
    ok({ tam_amount: 1_000_000, sam_amount: 100_000, som_amount: 10_000 }));

  it("accepts equal figures (a startup may serve its whole market)", () =>
    ok({ tam_amount: 500, sam_amount: 500, som_amount: 500 }));

  it("rejects the exact LAAM inversion", () =>
    rejects({ tam_amount: 50_000, sam_amount: 200_000, som_amount: 500_000 }, "sam_amount"));

  it("rejects SOM > SAM when TAM is fine", () =>
    rejects({ tam_amount: 1_000_000, sam_amount: 10, som_amount: 5_000 }, "som_amount"));

  it("rejects SOM > TAM when SAM is blank", () =>
    rejects({ tam_amount: 100, som_amount: 900 }, "som_amount"));

  it("accepts string values from a text-rendered field", () =>
    ok({ tam_amount: "1000", sam_amount: "500", som_amount: "100" }));

  it("rejects an inversion expressed as strings", () =>
    rejects({ tam_amount: "100", sam_amount: "500" }, "sam_amount"));

  it("ignores partially filled sets", () => {
    ok({ tam_amount: 100 });
    ok({ som_amount: 999_999 });
    ok({});
  });

  it("treats unparseable and empty values as absent", () => {
    assert.equal(marketAmount(""), null);
    assert.equal(marketAmount("   "), null);
    assert.equal(marketAmount("abc"), null);
    assert.equal(marketAmount(NaN), null);
    assert.equal(marketAmount(null), null);
    ok({ tam_amount: "abc", sam_amount: 5_000_000 });
  });

  // The form holds the as-you-type error until both compared fields have been
  // blurred, and identifies the second one through `comparedTo`. A wrong value
  // here means the live error either never appears or fires at someone still
  // typing the figure that resolves it.
  it("names the field each figure was measured against", () => {
    const pair = (v: Record<string, unknown>) => {
      const issue = marketSizeIssue(v);
      assert.notEqual(issue, null);
      return [String(issue!.path[0]), issue!.comparedTo];
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
});

describe("BUG-17 — founder name/role reject numeric-only input", () => {
  const base = { name: "Ayesha Khan", role: "CEO" };
  const parse = (over: Record<string, unknown>) => founderSchema.safeParse({ ...base, ...over });

  it("accepts an ordinary name and role", () => assert.equal(parse({}).success, true));

  it("rejects the reported numeric string as a name", () =>
    assert.equal(parse({ name: "223232323223" }).success, false));

  it("rejects a numeric role", () => assert.equal(parse({ role: "12345" }).success, false));

  it("rejects punctuation-only input", () =>
    assert.equal(parse({ name: "-- --" }).success, false));

  it("rejects a 35-digit string", () =>
    assert.equal(parse({ name: "1".repeat(35) }).success, false));

  it("caps absurd lengths even when letters are present", () =>
    assert.equal(parse({ name: "a".repeat(500) }).success, false));

  it("accepts non-Latin scripts", () => {
    assert.equal(parse({ name: "عائشہ خان" }).success, true);
    assert.equal(parse({ name: "李伟" }).success, true);
  });

  it("accepts names containing digits or punctuation alongside letters", () => {
    assert.equal(parse({ name: "O'Neill" }).success, true);
    assert.equal(parse({ name: "Anne-Marie" }).success, true);
    assert.equal(parse({ role: "Founder (CEO)" }).success, true);
    assert.equal(parse({ role: "Engineer L5" }).success, true);
  });
});
