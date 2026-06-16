import { NextResponse, type NextRequest } from "next/server";
import { clearAdminSessionCookie } from "@/lib/admin-session";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { isAdminEmail } from "@/lib/admin-allowlist";
import { registerApplicant, seedApplicantDraft } from "@/lib/applicant-auth";
import { getRegistrationConfig } from "@/lib/form-config.server";
import { buildZodSchema } from "@/lib/form-config";
import {
  applicantEmailError,
  applicantPasswordError,
} from "@/lib/applicant-password";

// Bump when the terms / privacy / data-usage agreement changes (spec §3 asks us
// to record which policy version the applicant consented to).
const CONSENT_VERSION = "2026-06-16";

/**
 * Applicant sign-up / sign-in. Separate from the committee portal
 * (`/api/admin/auth`): these accounts are never added to `admin_users`, and
 * admin emails are refused here so the two audiences never overlap.
 *
 * Body: { action: "register" | "login" | "resend", email, password?, profile? }
 *
 * Registration goes through Supabase `signUp` so the account must be verified
 * by email before it can sign in (when "Confirm email" is enabled on the
 * project). The §3 profile fields the admin configured are validated against
 * the registration form schema and seeded into the applicant's draft so they
 * prefill the full application later.
 */
export async function POST(req: NextRequest) {
  let body: {
    action?: string;
    email?: string;
    password?: string;
    profile?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action =
    body.action === "register" ? "register" : body.action === "resend" ? "resend" : "login";
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  const emailErr = applicantEmailError(email);
  if (emailErr) {
    return NextResponse.json({ error: emailErr }, { status: 400 });
  }
  if (action !== "resend" && !password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  // Admins belong in the committee portal — keep the audiences separate.
  if (await isAdminEmail(email)) {
    return NextResponse.json(
      { error: "This email is registered for committee access. Please use the admin portal." },
      { status: 403 }
    );
  }

  const { supabase, applyCookies } = createRouteHandlerClient(req);
  const origin = req.nextUrl.origin;
  const emailRedirectTo = `${origin}/apply/auth/callback`;

  // ── Resend the verification email ───────────────────────────────────────
  if (action === "resend") {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo },
    });
    if (error) {
      return NextResponse.json({ error: "Could not resend the email. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, resent: true });
  }

  // ── Register ────────────────────────────────────────────────────────────
  if (action === "register") {
    const passwordErr = applicantPasswordError(password);
    if (passwordErr) {
      return NextResponse.json({ error: passwordErr }, { status: 400 });
    }

    // Validate the admin-configured §3 profile fields (when a registration form
    // exists). Pre-migration / pre-seed there's no config — skip validation.
    const profile = body.profile ?? {};
    const config = await getRegistrationConfig();
    let validatedProfile: Record<string, unknown> = profile;
    if (config && config.length > 0) {
      const parsed = buildZodSchema(config).safeParse(profile);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        const path = first?.path.join(".") || "form";
        return NextResponse.json(
          { error: `Please check the "${path}" field: ${first?.message ?? "invalid"}`, fieldErrors: fieldErrorMap(parsed.error.issues) },
          { status: 400 }
        );
      }
      validatedProfile = parsed.data as Record<string, unknown>;
    }

    const fullName =
      typeof validatedProfile.full_name === "string" ? validatedProfile.full_name : null;

    const result = await registerApplicant(supabase, {
      email,
      password,
      fullName,
      emailRedirectTo,
    });

    if (result.status === "exists") {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 409 }
      );
    }
    if (result.status === "error") {
      const msg = result.message?.trim();
      const clientError =
        msg && (/password/i.test(msg) || /email/i.test(msg) || /signup|sign up/i.test(msg))
          ? msg
          : null;
      return NextResponse.json(
        { error: clientError ?? "Could not create your account. Please try again." },
        { status: clientError ? 400 : 500 }
      );
    }

    // Persist the §3 answers + consent so they prefill the application later.
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null;
    await seedApplicantDraft(result.userId, email, validatedProfile, {
      at: new Date().toISOString(),
      ip,
      version: CONSENT_VERSION,
    });

    if (result.status === "signed_in") {
      // "Confirm email" is OFF on the project → a session came back; sign in.
      const res = applyCookies(NextResponse.json({ ok: true, needsVerification: false }));
      res.cookies.set(clearAdminSessionCookie());
      return res;
    }
    // Normal path: must verify email before logging in.
    return NextResponse.json({ ok: true, needsVerification: true });
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signInErr) {
    const unconfirmed =
      signInErr.code === "email_not_confirmed" ||
      /not confirmed|confirm your email/i.test(signInErr.message);
    if (unconfirmed) {
      return NextResponse.json(
        {
          error: "Please verify your email before signing in. Check your inbox for the link.",
          needsVerification: true,
        },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const res = applyCookies(NextResponse.json({ ok: true }));
  res.cookies.set(clearAdminSessionCookie());
  return res;
}

/** Sign out the applicant. */
export async function DELETE(req: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerClient(req);
  await supabase.auth.signOut();
  return applyCookies(NextResponse.json({ ok: true }));
}

function fieldErrorMap(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_root";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
