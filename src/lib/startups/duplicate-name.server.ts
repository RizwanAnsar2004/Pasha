import type { createServiceClient } from "@/lib/supabase/server";

// One listing per company. Lifted out of api/submit/route.ts so the live
// as-you-type check and the submit gate share one implementation — two copies
// of a normalisation rule drift, and a name the field accepts but the submit
// endpoint rejects is worse than no check at all.

// Casefold and drop everything that is not a letter or digit, so "BizB",
// "biz b", "Biz-B" and "BizB." all reduce to the same key. Unicode-aware so
// non-Latin company names normalise rather than collapsing to an empty string.
export function normaliseStartupName(name: string): string {
  return name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

// Shortest name worth querying on. Below this the ILIKE filter matches most of
// the table and the result is noise, not a duplicate.
export const MIN_NAME_LENGTH = 2;

// Returns the existing listing's name when another user has already submitted
// the same company, or null.
//
// Candidates are narrowed in SQL by the longest word in the submitted name
// (ILIKE '%word%') and only then compared on the normalised key in JS.
// Postgres ILIKE cannot strip punctuation, so a pure SQL comparison would miss
// "Biz-B" vs "BizB"; pulling the whole table to compare in JS would read
// thousands of rows on every submission. The word filter keeps the read small
// while still catching spacing and punctuation variants.
//
// Scoped to OTHER users' submissions: an applicant editing or resubmitting
// their own application must not be blocked by their own row.
export async function findDuplicateStartupName(
  supabase: ReturnType<typeof createServiceClient>,
  submittedName: string,
  userId: string
): Promise<string | null> {
  const target = normaliseStartupName(submittedName);
  if (target.length < MIN_NAME_LENGTH) return null;

  const longestWord = submittedName
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0];
  if (!longestWord) return null;

  const { data, error } = await supabase
    .from("submissions")
    .select("startup_name, user_id")
    .neq("user_id", userId)
    .ilike("startup_name", `%${longestWord}%`)
    .limit(50);

  // A duplicate check must never be the reason a valid application fails to
  // submit — on a query error, let it through and rely on admin review.
  if (error || !data) return null;

  const hit = data.find(
    (r: { startup_name: string | null }) =>
      typeof r.startup_name === "string" &&
      normaliseStartupName(r.startup_name) === target
  );
  return hit?.startup_name ?? null;
}
