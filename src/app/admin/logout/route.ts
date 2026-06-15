import { NextResponse, type NextRequest } from "next/server";
import { clearAdminSessionCookie } from "@/lib/admin-session";

export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/admin/login", request.url), { status: 303 });
  res.cookies.set(clearAdminSessionCookie());
  return res;
}
