import "server-only";
import { cache } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-allowlist";
import { getFeaturedStatusByDatabankId } from "@/lib/featured-startups.server";

/**
 * Applicant accounts are ordinary Supabase Auth users that are NOT in the
 * `admin_users` allowlist. This keeps the public apply flow fully separate from
 * the committee/admin portal even though both ride on Supabase Auth.
 *
 * Server helpers here read the applicant's session from cookies and provision
 * accounts via the service-role admin API (so we can skip the email-confirm
 * round-trip and sign people straight in).
 */

/**
 * Who is making this request, from the Supabase session cookie:
 *   - "anon"      — no session
 *   - "admin"     — signed in, but the email is a committee/admin account
 *   - "applicant" — a genuine applicant account
 * Admins share the same Supabase Auth cookies as the admin portal, so we must
 * actively exclude them here — otherwise an admin session would let them use
 * (and submit) the apply form, breaking the separation.
 */
export const getApplicantContext = cache(
  async (): Promise<
    | { status: "anon"; user: null }
    | { status: "admin"; user: User }
    | { status: "applicant"; user: User }
  > => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { status: "anon", user: null };
    if (await isAdminEmail(user.email)) return { status: "admin", user };
    return { status: "applicant", user };
  }
);

/**
 * Current applicant from the request cookies, or null if not signed in OR the
 * session belongs to an admin (admins are not applicants). Use this as the gate
 * in applicant-only API routes.
 */
export async function getApplicantUser(): Promise<User | null> {
  const ctx = await getApplicantContext();
  return ctx.status === "applicant" ? ctx.user : null;
}

export type ApplicantDraft = {
  data: Record<string, unknown>;
  current_step: number;
  submitted: boolean;
  submission_id: string | null;
  /** true when the applicant has saved at least one answer */
  started: boolean;
};

/**
 * Load the signed-in applicant's resumable draft. Safe before the migration is
 * applied (returns an empty/not-started draft on any error).
 */
export const getApplicantDraft = cache(async (userId: string): Promise<ApplicantDraft> => {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("application_drafts")
    .select("data, current_step, submitted_at, submission_id")
    .eq("user_id", userId)
    .maybeSingle<{
      data: Record<string, unknown> | null;
      current_step: number | null;
      submitted_at: string | null;
      submission_id: string | null;
    }>();

  const values = (!error && data?.data) || {};
  return {
    data: values,
    current_step: (!error && data?.current_step) || 0,
    submitted: Boolean(!error && data?.submitted_at),
    submission_id: (!error && data?.submission_id) || null,
    started: Object.values(values).some(
      (v) => v !== "" && v !== false && v != null && !(Array.isArray(v) && v.length === 0)
    ),
  };
});

export type ApplicantSubmissionStatus = {
  /** Raw submissions.status (legacy 'pending'/'watchlist' tolerated). */
  status: string;
  /** Committee notes — shown to the applicant on "Needs Update"/"Rejected". */
  reviewerNotes: string | null;
  /** databank.pasha_verified for the published row (only when approved). */
  pashaVerified: boolean;
  /** An active featured window exists for the published row. */
  featuredActive: boolean;
};

/**
 * Load the workflow state of an applicant's submission for the dashboard.
 * Derives Verified/Featured from the published databank row (only meaningful
 * once approved). Safe before migrations: returns sensible defaults on error.
 */
export const getApplicantSubmissionStatus = cache(
  async (submissionId: string): Promise<ApplicantSubmissionStatus | null> => {
    const supabase = createServiceClient();
    const { data: sub, error } = await supabase
      .from("submissions")
      .select("status, reviewer_notes, startup_name")
      .eq("id", submissionId)
      .maybeSingle<{ status: string | null; reviewer_notes: string | null; startup_name: string | null }>();
    if (error || !sub) return null;

    let pashaVerified = false;
    let featuredActive = false;

    if (sub.status === "approved") {
      let databankId: string | null = null;
      const { data: bySource } = await supabase
        .from("databank")
        .select("id, pasha_verified")
        .eq("source_id", submissionId)
        .maybeSingle<{ id: string; pasha_verified: boolean | null }>();
      if (bySource?.id) {
        databankId = bySource.id;
        pashaVerified = Boolean(bySource.pasha_verified);
      } else if (sub.startup_name) {
        const { data: byName } = await supabase
          .from("databank")
          .select("id, pasha_verified")
          .ilike("startup_name", sub.startup_name)
          .limit(1)
          .maybeSingle<{ id: string; pasha_verified: boolean | null }>();
        if (byName?.id) {
          databankId = byName.id;
          pashaVerified = Boolean(byName.pasha_verified);
        }
      }
      if (databankId) {
        const featured = await getFeaturedStatusByDatabankId(databankId).catch(() => null);
        featuredActive = featured?.status === "active";
      }
    }

    return {
      status: sub.status ?? "submitted",
      reviewerNotes: sub.reviewer_notes ?? null,
      pashaVerified,
      featuredActive,
    };
  }
);

export type RegisterResult =
  | { status: "needs_verification"; userId: string }
  | { status: "signed_in"; userId: string }
  | { status: "exists" }
  | { status: "error"; message?: string };

/**
 * Register a new applicant via Supabase `signUp` (NOT the admin auto-confirm
 * API). With the project's "Confirm email" setting ON this creates an
 * unconfirmed user, sends the verification email, and returns NO session — so
 * the applicant cannot sign in until they click the link. We classify the
 * outcome for the caller:
 *   - needs_verification — created, must confirm email before logging in
 *   - signed_in          — created with a live session ("Confirm email" OFF)
 *   - exists             — the email is already registered
 *   - error              — sign-up failed
 *
 * `supabase` must be the route-handler client so any returned session is
 * persisted to the response cookies.
 */
export async function registerApplicant(
  supabase: SupabaseClient,
  params: { email: string; password: string; fullName?: string | null; emailRedirectTo: string }
): Promise<RegisterResult> {
  const { data, error } = await supabase.auth.signUp({
    email: params.email.toLowerCase(),
    password: params.password,
    options: {
      data: { role: "applicant", full_name: params.fullName ?? null },
      emailRedirectTo: params.emailRedirectTo,
    },
  });

  if (error) {
    if (/already|registered|exists/i.test(error.message)) return { status: "exists" };
    console.error("registerApplicant signUp failed:", error.message);
    return { status: "error", message: error.message };
  }

  const user = data.user;
  if (!user) return { status: "error" };

  // Supabase obfuscates "email already registered" by returning a user with an
  // empty identities array (and no session) to prevent account enumeration.
  if (Array.isArray(user.identities) && user.identities.length === 0) {
    return { status: "exists" };
  }

  if (data.session) return { status: "signed_in", userId: user.id };
  return { status: "needs_verification", userId: user.id };
}

/**
 * Seed (or overwrite) the applicant's draft with the values they entered at
 * registration, keyed by field_key so they prefill the application form later.
 * Also records the terms consent (timestamp/IP/version — spec §3).
 *
 * Resilient to a pre-migration DB: if a consent column doesn't exist yet we
 * strip it and retry (same strip-and-retry pattern as api/submit/route.ts).
 */
export async function seedApplicantDraft(
  userId: string,
  email: string,
  data: Record<string, unknown>,
  consent: { at: string; ip: string | null; version: string }
): Promise<void> {
  const supabase = createServiceClient();

  // Prefill the application's primary founder from the §3 account fields. At
  // registration `full_name` and `founder_mobile` are flat keys, but the
  // application form keys founders under a `founders` array — without this the
  // founder card would render empty even though we already have the details.
  const seedData: Record<string, unknown> = { ...data };
  const fullName = typeof seedData.full_name === "string" ? seedData.full_name.trim() : "";
  const founderMobile =
    typeof seedData.founder_mobile === "string" ? seedData.founder_mobile.trim() : "";
  if (!Array.isArray(seedData.founders) && (fullName || founderMobile)) {
    seedData.founders = [
      { name: fullName, email, mobile: founderMobile, is_primary: true },
    ];
  }

  const rec: Record<string, unknown> = {
    user_id: userId,
    email,
    data: seedData,
    current_step: 0,
    consent_at: consent.at,
    consent_ip: consent.ip,
    consent_version: consent.version,
    updated_at: new Date().toISOString(),
  };

  const upsert = () =>
    supabase.from("application_drafts").upsert(rec, { onConflict: "user_id" });

  let { error } = await upsert();
  let safety = 5;
  while (error && safety-- > 0) {
    const pg = error.message.match(/column "([^"]+)"/);
    const rest = error.message.match(/the '([^']+)' column/);
    const colName = pg?.[1] ?? rest?.[1];
    if (!colName || !(colName in rec)) break;
    delete rec[colName];
    ({ error } = await upsert());
  }
  if (error) console.error("seedApplicantDraft failed:", error.message);
}
