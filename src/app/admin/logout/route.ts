import { NextResponse, type NextRequest } from "next/server";
import { clearAdminSessionCookie } from "@/lib/auth/admin/admin-session";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerClient(request);
  await supabase.auth.signOut();

  const res = applyCookies(
    NextResponse.redirect(new URL("/admin/login", request.url), { status: 303 })
  );
  res.cookies.set(clearAdminSessionCookie());
  return res;
}
