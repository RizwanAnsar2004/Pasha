/**
 * Backfill existing published databank rows to match the new publish behavior:
 * mirror EVERY column-backed application field from the source submission into
 * the databank row's `answers` bag (keyed by field_key), and fill the renamed
 * promoted columns the directory reads. Historically the publish path copied a
 * hand-picked subset, so fields like stage / pitch deck were dropped.
 *
 *   npx tsx scripts/backfill-databank-columns.ts          # dry run
 *   npx tsx scripts/backfill-databank-columns.ts --apply  # write
 */
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const apply = process.argv.includes("--apply");
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// Renamed promoted columns the public directory reads: submission col → databank col.
const PROMOTED: Record<string, string> = {
  stage: "product_stage",
  pitch_deck_url: "pitch_deck_url",
  pitch_video: "video_pitch",
  year_founded: "founded_date",
  primary_sector: "primary_industry",
  secondary_sector: "secondary_industries",
  business_model: "business_types",
  description: "startup_idea",
  currently_raising: "fundraising",
};

async function main() {
  // Column-mapped form fields: field_key ← submission column.
  const { data: fields } = await sb
    .from("form_fields")
    .select("field_key, column_map, parent_field_id");
  const columnFields = (fields ?? [])
    .filter((f: Record<string, unknown>) => !f.parent_field_id && f.column_map)
    .map((f: Record<string, unknown>) => ({ field_key: f.field_key as string, column_map: f.column_map as string }));

  const { data: rows, error } = await sb
    .from("databank")
    .select("id, startup_name, source_id, answers")
    .eq("source", "submission")
    .not("source_id", "is", null);
  if (error) throw new Error(error.message);

  let updated = 0;
  let skipped = 0;

  for (const r of (rows ?? []) as Record<string, unknown>[]) {
    const { data: sub } = await sb
      .from("submissions")
      .select("*")
      .eq("id", r.source_id as string)
      .maybeSingle<Record<string, unknown>>();
    if (!sub) { skipped++; continue; }

    const answers = { ...((r.answers ?? {}) as Record<string, unknown>) };
    const patch: Record<string, unknown> = {};
    let touched = 0;

    // 1. Mirror every column-backed value into answers by field_key (fill blanks).
    for (const { field_key, column_map } of columnFields) {
      if (answers[field_key] !== undefined && answers[field_key] !== null) continue;
      const v = sub[column_map];
      if (v !== undefined && v !== null) { answers[field_key] = v; touched++; }
    }
    if (touched > 0) patch.answers = answers;

    // 2. Fill the renamed promoted columns the directory reads (blanks only).
    for (const [subCol, dbCol] of Object.entries(PROMOTED)) {
      if ((r as Record<string, unknown>)[dbCol]) continue; // don't clobber
      let v = sub[subCol];
      if (v === undefined || v === null || v === "") continue;
      // founded_date is a DATE column but year_founded is a plain year.
      if (dbCol === "founded_date") v = `${v}-01-01`;
      patch[dbCol] = v;
    }

    if (Object.keys(patch).length === 0) { skipped++; continue; }
    const cols = Object.keys(patch).filter((k) => k !== "answers");
    console.log(`${apply ? "UPDATE" : "would update"} ${String(r.startup_name).slice(0, 24).padEnd(26)} answers:+${touched}  cols:[${cols.join(",")}]`);
    if (apply) {
      const { error: upErr } = await sb.from("databank").update(patch).eq("id", r.id as string);
      if (upErr) { console.error(`  ✗ ${upErr.message}`); continue; }
    }
    updated++;
  }

  console.log(`\n${apply ? "Updated" : "Would update"} ${updated} row(s); ${skipped} unchanged.`);
  if (!apply) console.log("Re-run with --apply to write.");
}

main().catch((e) => { console.error(e); process.exit(1); });
