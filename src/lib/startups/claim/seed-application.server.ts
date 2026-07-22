import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

// When someone claims an imported directory profile, they should land in the
// applicant portal seeing THAT startup — fields populated, marked submitted —
// not a blank wizard. This reconstructs the application from the databank row:
// it reverses the submission→databank mapping used at approval time, creates an
// "approved" submission owned by the claimant, and links a submitted draft.

type DatabankRow = Record<string, unknown>;

// Treat imported sentinels ("NULL", "—") and blanks as absent.
const str = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t || t.toUpperCase() === "NULL" || t === "—") return undefined;
  return t;
};
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const yes = (v: unknown): "yes" | undefined => (v === true ? "yes" : undefined);

// The apply form autosaves a full skeleton of EMPTY fields on load, so a draft
// having keys doesn't mean the applicant typed anything. Recurse: "", false,
// null, empty arrays, and arrays/objects whose members are all blank count as
// empty — so we only refuse to seed when there's genuine typed content.
function isBlank(v: unknown): boolean {
  if (v === "" || v === false || v === null || v === undefined) return true;
  if (Array.isArray(v)) return v.every(isBlank);
  if (typeof v === "object") return Object.values(v).every(isBlank);
  return false;
}

// Reverse of the submission→databank column map (see admin/submission/route.ts):
// build form-field-keyed values the portal + completion engine read.
function draftDataFromDatabank(row: DatabankRow): Record<string, unknown> {
  const answers = (row.answers && typeof row.answers === "object" ? row.answers : {}) as Record<string, unknown>;
  const data: Record<string, unknown> = { ...answers };
  const set = (k: string, v: unknown) => {
    if (v !== undefined && v !== null) data[k] = v;
  };

  const foundedYear = (() => {
    const f = str(row.founded_date);
    if (!f) return undefined;
    const y = new Date(f).getFullYear();
    return Number.isFinite(y) ? String(y) : undefined;
  })();

  set("startup_name", str(row.startup_name));
  set("tagline", str(row.tagline));
  set("website", str(row.website));
  set("year_founded", foundedYear);
  set("primary_sector", str(row.primary_industry));
  set("secondary_sector", str(row.secondary_industries));
  set("business_model", str(row.business_types) ?? str(row.business_model));
  set("stage", str(row.product_stage));
  set("hq_city", str(row.city));
  set("hq_country", str(row.hq_country));
  set("nic_name", str(row.nic_name));
  set("description", str(row.startup_idea));
  set("logo_url", str(row.logo_url));
  set("total_employees", num(row.total_employees));
  set("female_employees", num(row.female_employees));
  set("company_linkedin", str(row.company_linkedin));
  set("company_x", str(row.company_x));
  set("company_instagram", str(row.company_instagram));
  set("company_facebook", str(row.company_facebook));
  set("company_youtube", str(row.company_youtube));
  set("awards", str(row.awards));
  set("certifications", str(row.certifications));
  set("women_led", yes(row.women_led));
  set("currently_hiring", yes(row.hiring));
  set("currently_raising", yes(row.fundraising));

  if (Array.isArray(row.key_persons) && row.key_persons.length > 0) {
    const founders: Record<string, unknown>[] = (row.key_persons as Record<string, unknown>[]).map((p, i) => ({
      ...p,
      is_primary: i === 0,
    }));
    data.founders = founders;
    const primaryName = str(founders[0]?.name);
    if (primaryName) set("founder_name", primaryName);
  }

  return data;
}

// Core submission columns (all exist — they're read in the approval flow).
function submissionRecordFromDatabank(
  row: DatabankRow,
  ownerId: string,
  email: string
): Record<string, unknown> {
  const primary = (Array.isArray(row.key_persons) ? (row.key_persons[0] as Record<string, unknown>) : undefined) ?? {};
  return {
    startup_name: str(row.startup_name) ?? "Untitled",
    tagline: str(row.tagline) ?? null,
    website: str(row.website) ?? null,
    description: str(row.startup_idea) ?? null,
    logo_url: str(row.logo_url) ?? null,
    hq_city: str(row.city) ?? null,
    hq_country: str(row.hq_country) ?? null,
    primary_sector: str(row.primary_industry) ?? null,
    secondary_sector: str(row.secondary_industries) ?? null,
    business_model: str(row.business_types) ?? null,
    total_employees: num(row.total_employees) ?? null,
    female_employees: num(row.female_employees) ?? null,
    nic_name: str(row.nic_name) ?? null,
    founders: Array.isArray(row.key_persons) ? row.key_persons : [],
    company_linkedin: str(row.company_linkedin) ?? null,
    company_x: str(row.company_x) ?? null,
    company_instagram: str(row.company_instagram) ?? null,
    company_facebook: str(row.company_facebook) ?? null,
    company_youtube: str(row.company_youtube) ?? null,
    awards: str(row.awards) ?? null,
    certifications: str(row.certifications) ?? null,
    // Founder columns are NOT NULL on submissions — always provide a value.
    founder_name: str(primary.name) ?? str(row.startup_name) ?? "Owner",
    founder_email: str(primary.email) ?? email,
    founder_mobile: str(primary.mobile) ?? "",
    founder_linkedin: str(primary.linkedin) ?? "",
    founder_role: str(primary.role) ?? "",
    founder_gender: str(primary.gender) ?? "",
    currently_raising: row.fundraising === true,
    answers: (row.answers && typeof row.answers === "object" ? row.answers : {}) as Record<string, unknown>,
    user_id: ownerId,
    status: "approved",
  };
}

// Self-heal on portal load: if this user has claimed a directory profile but
// their application hasn't been materialised yet (claim-time seeding may have
// been skipped), seed it now. Returns true when it seeded. Best-effort.
export async function ensureClaimedProfileSeeded(userId: string, email: string | null): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    // Already have a submitted / linked application → nothing to do.
    const { data: draft } = await supabase
      .from("application_drafts")
      .select("submitted_at, submission_id")
      .eq("user_id", userId)
      .maybeSingle<{ submitted_at: string | null; submission_id: string | null }>();
    if (draft?.submitted_at || draft?.submission_id) return false;

    // Find a directory profile this user owns via claim.
    const { data: claimed } = await supabase
      .from("databank")
      .select("id, claimed_email")
      .eq("claimed_by", userId)
      .eq("verified_claimed", true)
      .limit(1)
      .maybeSingle<{ id: string; claimed_email: string | null }>();
    if (!claimed?.id) return false;

    await seedClaimedApplication({
      ownerId: userId,
      email: email ?? claimed.claimed_email ?? "",
      databankId: claimed.id,
    });
    return true;
  } catch (e) {
    console.error("[claim] ensureClaimedProfileSeeded threw:", e instanceof Error ? e.message : e);
    return false;
  }
}

// Seed the claimant's portal so their claimed startup appears filled + submitted.
// Best-effort: never throws (the claim itself already succeeded).
export async function seedClaimedApplication(opts: {
  ownerId: string | null;
  email: string;
  databankId: string;
}): Promise<void> {
  const { ownerId, email, databankId } = opts;
  if (!ownerId) return;

  try {
    const supabase = createServiceClient();

    // Don't clobber an applicant who already has genuine work — but an empty
    // autosaved skeleton (all fields blank) must NOT block seeding.
    const { data: existing } = await supabase
      .from("application_drafts")
      .select("submitted_at, data")
      .eq("user_id", ownerId)
      .maybeSingle<{ submitted_at: string | null; data: Record<string, unknown> | null }>();
    const hasRealDraft = !!existing && (Boolean(existing.submitted_at) || !isBlank(existing.data));
    if (hasRealDraft) return;

    // select("*") avoids column-not-found errors across migration states.
    const { data: row } = await supabase
      .from("databank")
      .select("*")
      .eq("id", databankId)
      .maybeSingle<DatabankRow>();
    if (!row) return;

    // 1. Create an approved submission owned by the claimant (strip-and-retry
    //    so a missing optional column can't fail the whole insert).
    const rec = submissionRecordFromDatabank(row, ownerId, email);
    const insert = () => supabase.from("submissions").insert(rec).select("id").single();
    let { data: sub, error } = await insert();
    let safety = Object.keys(rec).length + 2;
    while (error && safety-- > 0) {
      // Only strip columns that don't exist — never on a constraint violation
      // (e.g. NOT NULL), which would drop a required column and loop.
      const missing = /does not exist|schema cache|could not find/i.test(error.message);
      const m = error.message.match(/column "([^"]+)"/) ?? error.message.match(/the '([^']+)' column/);
      const col = m?.[1];
      if (!missing || !col || !(col in rec)) break;
      delete rec[col];
      ({ data: sub, error } = await insert());
    }
    if (error || !sub) {
      console.error("[claim] seed submission failed:", error?.message);
      return;
    }

    // 2. Link the published databank row back to this submission so the portal's
    //    status lookup (by source_id) resolves to the live/verified profile.
    await supabase
      .from("databank")
      .update({ source: "submission", source_id: sub.id, source_status: "Approved" })
      .eq("id", databankId);

    // 3. Upsert the applicant's draft: fields populated + stamped submitted.
    const now = new Date().toISOString();
    const draftRec: Record<string, unknown> = {
      user_id: ownerId,
      email,
      data: draftDataFromDatabank(row),
      current_step: 0,
      submission_id: sub.id,
      submitted_at: now,
      updated_at: now,
    };
    const upsertDraft = () => supabase.from("application_drafts").upsert(draftRec, { onConflict: "user_id" });
    let { error: draftErr } = await upsertDraft();
    let dSafety = Object.keys(draftRec).length + 2;
    while (draftErr && dSafety-- > 0) {
      const m = draftErr.message.match(/column "([^"]+)"/) ?? draftErr.message.match(/the '([^']+)' column/);
      const col = m?.[1];
      if (!col || !(col in draftRec) || col === "user_id" || col === "data") break;
      delete draftRec[col];
      ({ error: draftErr } = await upsertDraft());
    }
    if (draftErr) console.error("[claim] seed draft failed:", draftErr.message);
  } catch (e) {
    console.error("[claim] seedClaimedApplication threw:", e instanceof Error ? e.message : e);
  }
}
