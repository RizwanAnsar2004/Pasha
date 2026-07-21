import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Same junk filter the homepage award section applies to raw awards text.
const JUNK = [/^https?:\/\//i, /^no formal/i, /^none$/i, /^n\/a$/i, /^-+$/];

export type ParsedAward = { title: string; year: number | null };

// Parse a newline-separated `databank.awards` text blob into structured award
export function parseAwardsText(awards: string | null | undefined): ParsedAward[] {
  if (!awards) return [];
  const out: ParsedAward[] = [];
  for (const raw of awards.split("\n")) {
    const line = raw.trim();
    if (!line || JUNK.some((p) => p.test(line))) continue;
    const yearMatch = line.match(/(19|20)\d{2}/);
    const year = yearMatch ? Number(yearMatch[0]) : null;
    const title = line.replace(/\s*[([-]?\s*(19|20)\d{2}\)?\s*$/, "").trim();
    if (title.length > 1) out.push({ title, year });
  }
  return out;
}

// Mirror a startup's raw awards text into `startup_awards` rows tagged
export async function syncAwardsFromText(
  supabase: SupabaseClient,
  databankId: string,
  awardsText: string | null | undefined
): Promise<void> {
  try {
    const parsed = parseAwardsText(awardsText);

    // Clear previous submission-derived rows for this startup.
    await supabase
      .from("startup_awards")
      .delete()
      .eq("databank_id", databankId)
      .eq("source", "submission");

    if (parsed.length === 0) return;

    // Don't duplicate an award an admin already added manually.
    const { data: manual } = await supabase
      .from("startup_awards")
      .select("title")
      .eq("databank_id", databankId)
      .eq("source", "manual");
    const manualTitles = new Set(
      (manual ?? []).map((r) => String((r as { title: string }).title).toLowerCase())
    );

    const rows = parsed
      .filter((p) => !manualTitles.has(p.title.toLowerCase()))
      .map((p, i) => ({
        databank_id: databankId,
        title: p.title,
        year: p.year,
        sort_order: i,
        source: "submission",
      }));

    if (rows.length > 0) {
      await supabase.from("startup_awards").insert(rows);
    }
  } catch {
    // best-effort — never block the caller
  }
}

// One structured award as submitted through the repeatable awards group.
export type StructuredAward = { title?: unknown; year?: unknown; description?: unknown };

function coerceAward(a: unknown): { title: string; year: number | null; description: string | null } {
  const o = (a && typeof a === "object" ? a : {}) as StructuredAward;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const yn = typeof o.year === "number" ? o.year : typeof o.year === "string" ? Number(o.year) : NaN;
  const year = Number.isFinite(yn) && yn >= 1900 && yn <= 2100 ? Math.trunc(yn) : null;
  const desc = typeof o.description === "string" ? o.description.trim() : "";
  return { title, year, description: desc || null };
}

// Mirror an applicant's structured awards (the repeatable title/year/description
export async function syncAwardsFromStructured(
  supabase: SupabaseClient,
  databankId: string,
  awards: unknown
): Promise<void> {
  try {
    const clean = (Array.isArray(awards) ? awards : [])
      .map(coerceAward)
      .filter((a) => a.title.length > 1 && !JUNK.some((p) => p.test(a.title)));

    // Clear previous submission-derived rows for this startup.
    await supabase
      .from("startup_awards")
      .delete()
      .eq("databank_id", databankId)
      .eq("source", "submission");

    if (clean.length === 0) return;

    // Don't duplicate an award an admin already added manually.
    const { data: manual } = await supabase
      .from("startup_awards")
      .select("title")
      .eq("databank_id", databankId)
      .eq("source", "manual");
    const manualTitles = new Set(
      (manual ?? []).map((r) => String((r as { title: string }).title).toLowerCase())
    );

    const rows = clean
      .filter((a) => !manualTitles.has(a.title.toLowerCase()))
      .map((a, i) => ({
        databank_id: databankId,
        title: a.title,
        year: a.year,
        description: a.description,
        sort_order: i,
        source: "submission",
      }));
    if (rows.length === 0) return;

    const { error } = await supabase.from("startup_awards").insert(rows);
    // Strip-and-retry if the description column hasn't been migrated in yet.
    if (error && /description/i.test(error.message)) {
      const withoutDesc = rows.map(({ description: _drop, ...rest }) => rest);
      await supabase.from("startup_awards").insert(withoutDesc);
    }
  } catch {
    // best-effort — never block the caller
  }
}
