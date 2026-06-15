import { NextResponse, type NextRequest } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { isAdminEmail } from "@/lib/admin-allowlist";
import { provisionApplicantAuthUser } from "@/lib/applicant-auth";

const MIN_PASSWORD = 8;

/**
 * Applicant sign-up / sign-in. Separate from the committee portal
 * (`/api/admin/auth`): these accounts are never added to `admin_users`, and
 * admin emails are refused here so the two audiences never overlap.
 *
 * Body: { action: "register" | "login", email, password }
 */
export async function POST(req: NextRequest) {
  let body: { action?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action === "register" ? "register" : "login";
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  // Admins belong in the committee portal — keep the audiences separate.
  if (await isAdminEmail(email)) {
    return NextResponse.json(
      { error: "This email is registered for committee access. Please use the admin portal." },
      { status: 403 }
    );
  }

  const { supabase, applyCookies } = createRouteHandlerClient(req);

  if (action === "register") {
    if (password.length < MIN_PASSWORD) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD} characters` },
        { status: 400 }
      );
    }
    const provisioned = await provisionApplicantAuthUser(email, password);
    if (provisioned === "exists") {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 409 }
      );
    }
    if (provisioned === "error") {
      return NextResponse.json({ error: "Could not create your account. Please try again." }, { status: 500 });
    }
  }

  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signInErr) {
    return NextResponse.json(
      { error: action === "register" ? "Account created, but sign-in failed. Please log in." : "Invalid email or password" },
      { status: 401 }
    );
  }

  return applyCookies(NextResponse.json({ ok: true }));
}

/** Sign out the applicant. */
export async function DELETE(req: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerClient(req);
  await supabase.auth.signOut();
  return applyCookies(NextResponse.json({ ok: true }));
}
