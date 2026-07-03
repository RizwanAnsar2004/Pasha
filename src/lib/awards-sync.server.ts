import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Same junk filter the homepage award section applies to raw awards text.
const JUNK = [/^https?:\/\//i, /^no formal/i, /^none$/i, /^n\/a$/i, /^-+$/];

export type ParsedAward = { title: string; year: number | null };

/**
 * Parse a newline-separated `databank.awards` text blob into structured award
 * entries. Skips blanks / junk placeholders and lifts a trailing 4-digit year
 * (e.g. "Winner — Tech Awards (2024)") into `year`.
 */
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

/**
 * Mirror a startup's raw awards text into `startup_awards` rows tagged
 * `source='submission'`. Replaces only prior submission-sourced rows for this
 * startup — admin-added ('manual') awards are never touched — and skips titles
 * that already exist as manual entries to avoid visible duplicates.
 *
 * Best-effort: swallows errors (e.g. table/column not yet migrated) so it can
 * never break approval or a Data Bank save.
 */
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
    /* best-effort — never block the caller */
  }
}
