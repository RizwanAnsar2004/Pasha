import { NextResponse, type NextRequest } from "next/server";
import { emailOrigin } from "@/lib/utils/site-url";
import {
  clearAdminSessionCookie,
  makeAdminSessionCookie,
} from "@/lib/auth/admin/admin-session";
import { isAdminEmail } from "@/lib/auth/admin/admin-allowlist";
import { provisionSupabaseAuthUser } from "@/lib/auth/admin/admin-auth-provision";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { verifyCaptcha } from "@/lib/auth/captcha";

export async function POST(req: NextRequest) {
  let body: {
    action?: string;
    email?: string;
    password?: string;
    captchaToken?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  // Both actions here are credential-stuffing / reset-spam targets, so neither
  // is exempt. Checked before the allowlist lookup so an unsolved challenge
  // can't be used to probe which addresses are committee members.
  const captcha = await verifyCaptcha(body.captchaToken, req);
  if (!captcha.ok) {
    return NextResponse.json(
      { error: captcha.error, captcha: true },
      { status: captcha.status }
    );
  }

  // ── Forgot password ───────────────────────────────────────────────────── Only allowlisted committee emails get a reset link; everyone else gets.
  if (body.action === "forgot") {
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!(await isAdminEmail(email))) {
      return NextResponse.json(
        { error: "No account found with this email." },
        { status: 404 }
      );
    }
    const { supabase, applyCookies } = createRouteHandlerClient(req);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${emailOrigin()}/apply/auth/callback?redirect=/admin/reset-password`,
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

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  if (!(await isAdminEmail(email))) {
    return NextResponse.json(
      { error: "This email is not authorised for committee access" },
      { status: 401 }
    );
  }

  const { supabase, applyCookies } = createRouteHandlerClient(req);

  let { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });

  // First sign-in for an allowlisted admin added only to admin_users: create the Supabase Auth account with the password they chose, then sign in again.
  if (signInErr) {
    const created = await provisionSupabaseAuthUser(email, password);
    if (created) {
      const retry = await supabase.auth.signInWithPassword({ email, password });
      signInErr = retry.error;
    }
  }

  if (signInErr) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const res = applyCookies(NextResponse.json({ ok: true }));
  res.cookies.set(makeAdminSessionCookie(email));
  return res;
}

export async function DELETE(req: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerClient(req);
  await supabase.auth.signOut();

  const res = applyCookies(NextResponse.json({ ok: true }));
  res.cookies.set(clearAdminSessionCookie());
  return res;
}
