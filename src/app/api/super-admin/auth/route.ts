// Super-admin login / logout.

import { NextResponse } from "next/server";
import {
  endSuperAdminSession,
  startSuperAdminSession,
  validateSuperAdminCredentials,
} from "@/lib/auth/admin/super-admin";
import { verifyCaptcha } from "@/lib/auth/captcha";

export async function POST(req: Request) {
  let body: { email?: string; password?: string; captchaToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // The highest-value credentials on the deployment — gated before the password
  // is even compared.
  const captcha = await verifyCaptcha(body.captchaToken, req);
  if (!captcha.ok) {
    return NextResponse.json(
      { error: captcha.error, captcha: true },
      { status: captcha.status }
    );
  }

  const err = validateSuperAdminCredentials(
    String(body.email ?? ""),
    String(body.password ?? "")
  );
  if (err) {
    // Deliberately generic message to the client — the specific tag is only useful for server logs.
    console.log(`super-admin login rejected: ${err}`);
    if (err === "config_missing") {
      return NextResponse.json(
        { error: "Super admin not configured on this deployment" },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  await startSuperAdminSession(String(body.email));
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await endSuperAdminSession();
  return NextResponse.json({ ok: true });
}
