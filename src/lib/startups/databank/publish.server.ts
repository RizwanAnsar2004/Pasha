import "server-only";
import type { createServiceClient } from "@/lib/supabase/server";
import { getColumnMappedFields } from "@/lib/forms/form-config.server";
import { isYes } from "@/lib/startups/vetting/badges";
import { getOptionIndex } from "@/lib/options/index.server";
import { resolveOptionLabel } from "@/lib/options/resolve";
import { notifyRagDatabank } from "@/lib/ai/rag-sync";
import { syncAwardsFromStructured, syncAwardsFromText } from "@/lib/startups/awards/awards-sync.server";

type ServiceClient = ReturnType<typeof createServiceClient>;

// Coerce an answers-bag value to a finite number, else null.
function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

// Find the published databank row id for a submission (by source_id, else name).
async function resolveDatabankId(
  supabase: ServiceClient,
  submissionId: string,
  startupName: string | null
): Promise<string | null> {
  const { data: bySource } = await supabase
    .from("databank")
    .select("id")
    .eq("source_id", submissionId)
    .maybeSingle();
  if (bySource?.id) return bySource.id as string;
  if (startupName) {
    const { data: byName } = await supabase
      .from("databank")
      .select("id")
      .ilike("startup_name", startupName)
      .limit(1)
      .maybeSingle();
    if (byName?.id) return byName.id as string;
  }
  return null;
}

// Materialise a submission into the public `databank` row (insert or update).
// This is the single source of truth for submission -> databank projection,
// shared by the admin approve action and the applicant partial-edit resync so
// the two paths can never drift. Best-effort: returns the published row id.
export async function publishSubmissionToDatabank(
  supabase: ServiceClient,
  submissionId: string
): Promise<{ ok: boolean; databankId: string | null; error?: string }> {
  const { data: full } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", submissionId)
    .maybeSingle();
  if (!full?.startup_name) return { ok: false, databankId: null, error: "Submission not found" };

  const founded_date = full.year_founded ? `${full.year_founded}-01-01` : null;
  // hq_city may be an option id, so compare on the resolved label, not the raw value.
  const optionIndex = await getOptionIndex();
  const cityLabel = resolveOptionLabel(optionIndex, "HQ_CITIES", full.hq_city);
  const city = full.outside_pakistan
    ? null
    : cityLabel === "Other"
      ? full.hq_other ?? null
      : full.hq_city ?? null;

  const answers = (full.answers ?? {}) as Record<string, unknown>;

  // Mirror EVERY column-backed field onto the answers bag under its field_key so
  // the databank editor (which reads answers-first) can edit every field.
  const columnFields = await getColumnMappedFields();
  const fullBag = full as Record<string, unknown>;
  const mergedAnswers: Record<string, unknown> = { ...answers };
  for (const { field_key, column_map } of columnFields) {
    if (mergedAnswers[field_key] !== undefined && mergedAnswers[field_key] !== null) continue;
    const v = fullBag[column_map];
    if (v !== undefined && v !== null) mergedAnswers[field_key] = v;
  }

  const databankRow = {
    source: "submission",
    source_id: full.id,
    source_status: "Approved",
    startup_name: full.startup_name,
    company_name: full.startup_name,
    tagline: full.tagline ?? null,
    website: full.website ?? null,
    founded_date,
    primary_industry: full.primary_sector ?? null,
    secondary_industries: full.secondary_sector ?? null,
    business_types: full.business_model ?? null,
    product_stage: full.stage ?? null,
    city,
    nic_name: full.nic_name ?? null,
    contact_person: full.founder_name ?? null,
    contact_email: full.founder_email ?? null,
    total_employees: full.total_employees ?? null,
    female_employees: full.female_employees ?? null,
    number_of_customers: toNum(answers.monthly_active_users),
    logo_url: full.logo_url ?? null,
    startup_idea: full.description ?? null,
    key_persons: full.founders ?? [],
    company_linkedin: full.company_linkedin ?? null,
    company_x: full.company_x ?? null,
    company_instagram: full.company_instagram ?? null,
    company_facebook: full.company_facebook ?? null,
    company_youtube: full.company_youtube ?? null,
    hq_country: full.hq_country ?? null,
    awards: full.awards ?? null,
    certifications: full.certifications ?? null,
    pitch_deck_url: full.pitch_deck_url ?? null,
    video_pitch: full.pitch_video ?? null,
    women_led: isYes(answers.women_led),
    hiring: isYes(answers.currently_hiring),
    fundraising: full.currently_raising ?? isYes(answers.currently_raising),
    answers: mergedAnswers,
    updated_at: new Date().toISOString(),
  };

  // Upsert the public row: update by source_id, else by name, else insert.
  const writeOnce = async (
    rec: Record<string, unknown>
  ): Promise<{ error: { message: string } | null }> => {
    const { data: bySource } = await supabase
      .from("databank")
      .select("id")
      .eq("source_id", full.id)
      .maybeSingle();
    if (bySource?.id) {
      return supabase.from("databank").update(rec).eq("id", bySource.id);
    }
    const { data: updated, error: updErr } = await supabase
      .from("databank")
      .update(rec)
      .ilike("startup_name", full.startup_name as string)
      .select("id");
    if (updErr) return { error: updErr };
    if (!updated || updated.length === 0) {
      return supabase.from("databank").insert(rec);
    }
    return { error: null };
  };

  const rec: Record<string, unknown> = { ...databankRow };
  let { error: dbErr } = await writeOnce(rec);
  // Self-heal against columns this DB doesn't have yet (expand/migrate/contract).
  let safety = Object.keys(rec).length + 2;
  while (dbErr && safety-- > 0) {
    const m =
      dbErr.message.match(/column "([^"]+)"/) ?? dbErr.message.match(/the '([^']+)' column/);
    const col = m?.[1];
    if (!col || !(col in rec)) break;
    delete rec[col];
    ({ error: dbErr } = await writeOnce(rec));
  }
  if (dbErr) {
    console.error("databank publish failed:", dbErr.message);
    return { ok: false, databankId: null, error: dbErr.message };
  }

  const publishedId = await resolveDatabankId(supabase, full.id as string, full.startup_name as string);
  if (publishedId) {
    notifyRagDatabank("UPDATE", publishedId);
    // Mirror the applicant's awards into structured startup_awards rows.
    const structuredAwards = (answers as Record<string, unknown>).awards;
    if (Array.isArray(structuredAwards) && structuredAwards.length > 0) {
      await syncAwardsFromStructured(supabase, publishedId, structuredAwards);
    } else {
      await syncAwardsFromText(supabase, publishedId, full.awards);
    }
  }
  return { ok: true, databankId: publishedId };
}
