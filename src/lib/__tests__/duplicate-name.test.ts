import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  MIN_NAME_LENGTH,
  findDuplicateStartupName,
  normaliseStartupName,
} from "@/lib/startups/duplicate-name.server";

// The as-you-type check and the submit gate call the same matcher. If these
// two ever disagree, the field accepts a name the submit endpoint rejects,
// which is worse than having no live check at all.

test("spacing, punctuation and case all collapse to one key", () => {
  const key = normaliseStartupName("BizB");
  for (const variant of ["bizb", "biz b", "Biz-B", "BizB.", "  BIZ  B  ", "biz.b"]) {
    assert.equal(normaliseStartupName(variant), key, variant);
  }
});

test("non-Latin names normalise instead of collapsing to empty", () => {
  assert.equal(normaliseStartupName("کاروبار"), "کاروبار");
  assert.notEqual(normaliseStartupName("北京科技"), "");
  // Punctuation-only input has nothing left, which is what MIN_NAME_LENGTH
  // guards against querying on.
  assert.equal(normaliseStartupName("... --- ..."), "");
});

test("different companies do not collide", () => {
  assert.notEqual(normaliseStartupName("BizB"), normaliseStartupName("BizBee"));
  assert.notEqual(normaliseStartupName("Laam"), normaliseStartupName("Laam Pro"));
});

// A fake matching the shape the real query returns, so the candidate-narrowing
// and comparison logic can be exercised without a database.
function fakeSupabase(rows: { startup_name: string | null; user_id: string }[], opts = {}) {
  const { error = null } = opts as { error?: unknown };
  const captured: { ilike?: string; neq?: string } = {};
  const builder = {
    select: () => builder,
    neq: (_col: string, v: string) => ((captured.neq = v), builder),
    ilike: (_col: string, v: string) => ((captured.ilike = v), builder),
    limit: () => Promise.resolve({ data: error ? null : rows, error }),
  };
  return { client: { from: () => builder } as never, captured };
}

test("finds a punctuation variant submitted by another user", async () => {
  const { client } = fakeSupabase([{ startup_name: "Biz-B", user_id: "other" }]);
  assert.equal(await findDuplicateStartupName(client, "BizB", "me"), "Biz-B");
});

test("returns the existing spelling, not the submitted one", async () => {
  const { client } = fakeSupabase([{ startup_name: "biz b", user_id: "other" }]);
  assert.equal(await findDuplicateStartupName(client, "BizB.", "me"), "biz b");
});

test("a near-miss that survives the SQL filter is still rejected in JS", async () => {
  // ILIKE '%BizB%' also matches "BizBee"; the normalised comparison is what
  // stops it being reported as the same company.
  const { client } = fakeSupabase([{ startup_name: "BizBee", user_id: "other" }]);
  assert.equal(await findDuplicateStartupName(client, "BizB", "me"), null);
});

test("narrows on the longest word and excludes the caller", async () => {
  const { client, captured } = fakeSupabase([]);
  await findDuplicateStartupName(client, "The Laam Company", "me-123");
  assert.equal(captured.ilike, "%Company%");
  assert.equal(captured.neq, "me-123");
});

test("a name shorter than the minimum is never queried", async () => {
  const { client, captured } = fakeSupabase([{ startup_name: "A", user_id: "other" }]);
  assert.equal(await findDuplicateStartupName(client, "A", "me"), null);
  assert.equal(captured.ilike, undefined, "should not have hit the database");
  assert.ok(MIN_NAME_LENGTH >= 2);
});

test("a query error lets the application through rather than blocking it", async () => {
  const { client } = fakeSupabase([], { error: new Error("connection lost") });
  assert.equal(await findDuplicateStartupName(client, "BizB", "me"), null);
});
