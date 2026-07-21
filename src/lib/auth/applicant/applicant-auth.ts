import "server-only";
import { cache } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin/admin-allowlist";
import { getFeaturedStatusByDatabankId } from "@/lib/startups/directory/featured-startups.server";

// Applicant accounts are ordinary Supabase Auth users that are NOT in the

// Who is making this request, from the Supabase session cookie:
export const getApplicantContext = cache(
  async (): Promise<
    | { status: "anon"; user: null }
    | { status: "admin"; user: User }
    | { status: "applicant"; user: User }
  > => {
    const supabase = await createClient();
    // A stale/rotated refresh token makes getUser() surface an AuthApiError
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) {
        // Auth failure with a session cookie present means the refresh token is
        await clearStaleSession(supabase);
        return { status: "anon", user: null };
      }
      if (!user) return { status: "anon", user: null };
      if (await isAdminEmail(user.email)) return { status: "admin", user };
      return { status: "applicant", user };
    } catch {
      // getUser threw (e.g. the refresh call rejected) — same remedy.
      await clearStaleSession(supabase);
      return { status: "anon", user: null };
    }
  }
);

// Best-effort removal of the stale Supabase auth cookie after an auth error.
async function clearStaleSession(supabase: SupabaseClient): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Clearing is best-effort — never let it mask the original result.
  }
}

// Current applicant from the request cookies, or null if not signed in OR the
export async function getApplicantUser(): Promise<User | null> {
  const ctx = await getApplicantContext();
  return ctx.status === "applicant" ? ctx.user : null;
}

export type ApplicantDraft = {
  data: Record<string, unknown>;
  current_step: number;
  submitted: boolean;
  submission_id: string | null;
  // true when the applicant has saved at least one answer
  started: boolean;
};

// Load the signed-in applicant's resumable draft. Safe before the migration is
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
  // Raw submissions.status (legacy 'pending'/'watchlist' tolerated).
  status: string;
  // Committee notes — shown to the applicant on "Needs Update"/"Rejected".
  reviewerNotes: string | null;
  // databank.pasha_verified for the published row (only when approved).
  pashaVerified: boolean;
  // An active featured window exists for the published row.
  featuredActive: boolean;
};

// Load the workflow state of an applicant's submission for the dashboard.
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

// Register a new applicant via Supabase `signUp` (NOT the admin auto-confirm
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
  if (Array.isArray(user.identities) && user.identities.length === 0) {
    return { status: "exists" };
  }

  if (data.session) return { status: "signed_in", userId: user.id };

  // No session → the project still requires email confirmation. Auto-confirm via
  // the service role and sign in, so registration always routes straight into
  // the app without a verification screen.
  const admin = createServiceClient();
  const { error: confirmErr } = await admin.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  });
  if (confirmErr) {
    return { status: "needs_verification", userId: user.id };
  }
  const { data: signIn } = await supabase.auth.signInWithPassword({
    email: params.email.toLowerCase(),
    password: params.password,
  });
  if (signIn.session) return { status: "signed_in", userId: user.id };
  return { status: "needs_verification", userId: user.id };
}

// Seed (or overwrite) the applicant's draft with the values they entered at
export async function seedApplicantDraft(
  userId: string,
  email: string,
  data: Record<string, unknown>,
  consent: { at: string; ip: string | null; version: string }
): Promise<void> {
  const supabase = createServiceClient();

  // Prefill the application's primary founder from the §3 account fields. At
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
