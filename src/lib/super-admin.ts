// Self-contained super-admin auth. Sits ENTIRELY outside Supabase Auth:
// hardcoded email + scrypt-hashed password from env vars, HMAC-signed
// HTTP-only cookie for session state. No emails are ever sent (the user
// explicitly didn't want a magic-link flow for this account).
//
// Why a separate stack? The super admin's only job is to manage the
// admin allowlist — the people who can sign into the regular Supabase-
// backed admin panel. Mixing the two would mean a Supabase Auth bug or
// email-deliverability incident locks the bootstrap account out too.

import { cookies } from "next/headers";
import crypto from "crypto";

export const SUPER_ADMIN_COOKIE = "psec_super_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Public-facing error shape for the super-admin auth API.
export type SuperAdminAuthError =
  | "missing_credentials"
  | "wrong_email"
  | "wrong_password"
  | "config_missing"
  | "session_invalid";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

// --- password hashing ---

/**
 * Verify a plaintext password against the stored scrypt hash. The hash
 * format is `scrypt:<saltHex>:<hashHex>` produced by Node's crypto.scrypt.
 */
function verifyPassword(plaintext: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split(":");
  // ── TEMP: plaintext fallback (no hashing) ──────────────────
  // If the stored value isn't in `scrypt:<salt>:<hash>` format, treat it
  // as a literal plaintext password and compare directly. REMOVE and go
  // back to hashed-only before this is anything but local dev.
  if (scheme !== "scrypt" || !saltHex || !hashHex) {
    return plaintext === stored;
  }
  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const got = crypto.scryptSync(plaintext, salt, expected.length);
    return crypto.timingSafeEqual(expected, got);
  } catch {
    return false;
  }
}

// --- cookie signing ---

type Session = { sub: string; iat: number; exp: number };

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
function base64urlDecode(s: string): Buffer {
  return Buffer.from(
    s.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (s.length % 4)) % 4),
    "base64"
  );
}

function sign(payload: Session): string {
  const secret = requireEnv("SUPER_ADMIN_COOKIE_SECRET");
  const body = base64url(Buffer.from(JSON.stringify(payload)));
  const sig = base64url(
    crypto.createHmac("sha256", secret).update(body).digest()
  );
  return `${body}.${sig}`;
}

function verifyCookie(value: string | null | undefined): Session | null {
  if (!value) return null;
  const [body, sig] = value.split(".");
  if (!body || !sig) return null;
  try {
    const secret = requireEnv("SUPER_ADMIN_COOKIE_SECRET");
    const expected = base64url(
      crypto.createHmac("sha256", secret).update(body).digest()
    );
    if (
      !crypto.timingSafeEqual(
        Buffer.from(sig, "utf8"),
        Buffer.from(expected, "utf8")
      )
    ) {
      return null;
    }
    const parsed: Session = JSON.parse(base64urlDecode(body).toString("utf8"));
    if (!parsed.exp || parsed.exp * 1000 < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

// --- public API ---

/**
 * Validate the email/password pair. Returns null on success, or a tagged
 * error code so the calling route can decide whether to surface the
 * specific reason. (We intentionally surface "wrong email" vs "wrong
 * password" to the same generic message — the tag is only for server
 * logs.)
 */
export function validateSuperAdminCredentials(
  email: string,
  password: string
): SuperAdminAuthError | null {
  if (!email || !password) return "missing_credentials";

  let expectedEmail: string;
  let storedHash: string;
  try {
    expectedEmail = requireEnv("SUPER_ADMIN_EMAIL").toLowerCase();
    storedHash = requireEnv("SUPER_ADMIN_PASSWORD_HASH");
  } catch {
    return "config_missing";
  }

  if (email.toLowerCase() !== expectedEmail) return "wrong_email";
  if (!verifyPassword(password, storedHash)) return "wrong_password";
  return null;
}

/** Write the signed session cookie to the response. Call from a route handler. */
export async function startSuperAdminSession(email: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const session: Session = {
    sub: email.toLowerCase(),
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const jar = await cookies();
  jar.set({
    name: SUPER_ADMIN_COOKIE,
    value: sign(session),
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSuperAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.set({
    name: SUPER_ADMIN_COOKIE,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Read the session if valid; returns the super-admin email or null. */
export async function readSuperAdminSession(): Promise<string | null> {
  const jar = await cookies();
  const sess = verifyCookie(jar.get(SUPER_ADMIN_COOKIE)?.value);
  return sess?.sub ?? null;
}
