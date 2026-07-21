import { NextResponse, type NextRequest } from "next/server";
import { clearAdminSessionCookie } from "@/lib/auth/admin/admin-session";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { isAdminEmail } from "@/lib/auth/admin/admin-allowlist";
import { registerApplicant, seedApplicantDraft } from "@/lib/auth/applicant/applicant-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { getRegistrationConfig } from "@/lib/forms/form-config.server";
import { buildZodSchema } from "@/lib/forms/form-config";
import { getFormOptionRegistry } from "@/lib/options/registry.server";
import {
  applicantEmailError,
  applicantPasswordError,
} from "@/lib/auth/applicant/applicant-password";

// Bump when the terms / privacy / data-usage agreement changes (spec §3 asks us to record which policy version the applicant consented to).
const CONSENT_VERSION = "2026-06-16";

// Applicant sign-up / sign-in. Separate from the committee portal
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
    body.action === "register"
      ? "register"
      : body.action === "resend"
      ? "resend"
      : body.action === "check"
      ? "check"
      : body.action === "forgot"
      ? "forgot"
      : "login";
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  const emailErr = applicantEmailError(email);
  if (emailErr) {
    return NextResponse.json({ error: emailErr }, { status: 400 });
  }
  if (action !== "resend" && action !== "check" && action !== "forgot" && !password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  // Admins belong in the committee portal — keep the audiences separate.
  if (action !== "forgot" && (await isAdminEmail(email))) {
    return NextResponse.json(
      { error: "Invalid Email And Password." },
      { status: 403 }
    );
  }

  // ── Email existence check (signup step 1) ────────────────────────────────── Lets the UI flag an already-registered email before the applicant.
  if (action === "check") {
    try {
      const admin = createServiceClient();
      const { data, error } = await admin.rpc("applicant_email_exists", { p_email: email });
      if (error) return NextResponse.json({ exists: false });
      return NextResponse.json({ exists: Boolean(data) });
    } catch {
      return NextResponse.json({ exists: false });
    }
  }

  // ── Forgot password ───────────────────────────────────────────────────── Only send a reset link to a real applicant account; otherwise tell the UI.
  if (action === "forgot") {
    let exists = false;
    try {
      const admin = createServiceClient();
      const { data, error } = await admin.rpc("applicant_email_exists", { p_email: email });
      // A committee/admin email has a Supabase auth user too, so the existence RPC alone would match it — exclude admins here so applicant reset is only.
      exists = !error && Boolean(data) && !(await isAdminEmail(email));
    } catch {
      exists = false;
    }
    if (!exists) {
      return NextResponse.json(
        { error: "No account found with this email." },
        { status: 404 }
      );
    }
    const { supabase, applyCookies } = createRouteHandlerClient(req);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.nextUrl.origin}/apply/auth/callback?redirect=/apply/reset-password`,
    });
    if (error) {
      return NextResponse.json(
        { error: "Could not send the reset email. Please try again." },
        { status: 500 }
      );
    }
    // Return the PKCE code_verifier cookie so the callback can exchange the recovery code later; without it the reset link reads as expired.
    return applyCookies(NextResponse.json({ ok: true }));
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
    // Persist the refreshed PKCE code_verifier (same reason as register below).
    return applyCookies(NextResponse.json({ ok: true, resent: true }));
  }

  // ── Register ────────────────────────────────────────────────────────────
  if (action === "register") {
    const passwordErr = applicantPasswordError(password);
    if (passwordErr) {
      return NextResponse.json({ error: passwordErr }, { status: 400 });
    }

    // Validate the admin-configured §3 profile fields (when a registration form exists).
    const profile = body.profile ?? {};
    const [config] = await Promise.all([getRegistrationConfig(), getFormOptionRegistry()]);
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
    return applyCookies(NextResponse.json({ ok: true, needsVerification: true }));
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

// Sign out the applicant.
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
