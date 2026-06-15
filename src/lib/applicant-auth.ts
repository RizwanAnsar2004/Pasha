import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-allowlist";

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

/**
 * Create a Supabase Auth user for a new applicant (email_confirm=true so they
 * can sign in immediately). Returns:
 *   - "created"  — a brand new account was provisioned
 *   - "exists"   — the email is already registered
 *   - "error"    — provisioning failed (message logged)
 */
export async function provisionApplicantAuthUser(
  email: string,
  password: string
): Promise<"created" | "exists" | "error"> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return "error";

  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      app_metadata: { role: "applicant" },
    }),
  });

  if (res.ok) return "created";

  const body = await res.text();
  // Supabase returns 422 when the email is already registered.
  if (res.status === 422 || /already|exists|registered/i.test(body)) {
    return "exists";
  }

  console.error("provisionApplicantAuthUser failed:", res.status, body);
  return "error";
}
