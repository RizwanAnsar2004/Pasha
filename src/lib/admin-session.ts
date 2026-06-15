import { cookies } from "next/headers";
import crypto from "crypto";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const ADMIN_COOKIE = "psec_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function verifyPassword(plaintext: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const got = crypto.scryptSync(plaintext, salt, expected.length);
    return crypto.timingSafeEqual(expected, got);
  } catch {
    return false;
  }
}

type Session = { sub: string; iat: number; exp: number };

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function base64urlDecode(s: string): Buffer {
  return Buffer.from(
    s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4),
    "base64"
  );
}

function sign(payload: Session): string {
  const secret = requireEnv("ADMIN_COOKIE_SECRET");
  const body = base64url(Buffer.from(JSON.stringify(payload)));
  const sig = base64url(crypto.createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}

function verifyCookie(value: string | null | undefined): Session | null {
  if (!value) return null;
  const dotIdx = value.lastIndexOf(".");
  if (dotIdx === -1) return null;
  const body = value.slice(0, dotIdx);
  const sig = value.slice(dotIdx + 1);
  if (!body || !sig) return null;
  try {
    const secret = requireEnv("ADMIN_COOKIE_SECRET");
    const expected = base64url(crypto.createHmac("sha256", secret).update(body).digest());
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"))) {
      return null;
    }
    const parsed: Session = JSON.parse(base64urlDecode(body).toString("utf8"));
    if (!parsed.exp || parsed.exp * 1000 < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export type AdminAuthError =
  | "missing_credentials"
  | "wrong_email"
  | "wrong_password"
  | "config_missing";

export function validateAdminCredentials(
  email: string,
  password: string
): AdminAuthError | null {
  if (!email || !password) return "missing_credentials";
  let expectedEmail: string;
  let storedHash: string;
  try {
    expectedEmail = requireEnv("ADMIN_EMAIL").toLowerCase();
    storedHash = requireEnv("ADMIN_PASSWORD_HASH");
  } catch {
    return "config_missing";
  }
  if (email.toLowerCase() !== expectedEmail) return "wrong_email";
  // if (!verifyPassword(password, storedHash)) return "wrong_password";
  if (password !== storedHash) return "wrong_password";

  return null;
}

const cookieSecure = process.env.NODE_ENV === "production";

/** Returns cookie params to be set via NextResponse.cookies.set() in a route handler. */
export function makeAdminSessionCookie(email: string): ResponseCookie {
  const now = Math.floor(Date.now() / 1000);
  const session: Session = { sub: email.toLowerCase(), iat: now, exp: now + SESSION_TTL_SECONDS };
  return {
    name: ADMIN_COOKIE,
    value: sign(session),
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

/** Returns cookie params to clear the session via NextResponse.cookies.set() in a route handler. */
export function clearAdminSessionCookie(): ResponseCookie {
  return {
    name: ADMIN_COOKIE,
    value: "",
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  };
}

/** Read the session from an incoming request (server components / layouts). */
export async function readAdminSession(): Promise<string | null> {
  const jar = await cookies();
  const sess = verifyCookie(jar.get(ADMIN_COOKIE)?.value);
  return sess?.sub ?? null;
}
