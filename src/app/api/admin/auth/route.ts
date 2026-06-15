import { NextResponse, type NextRequest } from "next/server";
import {
  clearAdminSessionCookie,
  makeAdminSessionCookie,
} from "@/lib/admin-session";
import { isAdminEmail } from "@/lib/admin-allowlist";
import { provisionSupabaseAuthUser } from "@/lib/admin-auth-provision";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

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

  // First sign-in for an allowlisted admin added only to admin_users: create the
  // Supabase Auth account with the password they chose, then sign in again.
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
