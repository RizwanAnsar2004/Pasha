import { NextResponse } from "next/server";
import {
  clearAdminSessionCookie,
  makeAdminSessionCookie,
  validateAdminCredentials,
} from "@/lib/admin-session";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const err = validateAdminCredentials(
    String(body.email ?? ""),
    String(body.password ?? "")
  );

  console.log(err);
  if (err) {
    console.log(`admin login rejected: ${err}`);
    if (err === "config_missing") {
      return NextResponse.json(
        { error: "Admin not configured on this deployment" },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(makeAdminSessionCookie(String(body.email)));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearAdminSessionCookie());
  return res;
}
