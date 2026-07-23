// Cloudflare Turnstile verification for the auth endpoints.
//
// Verified here rather than through Supabase's built-in captcha setting so the
// check lives with the routes it protects, works the same for every action
// (register / login / forgot / resend), and needs no dashboard configuration.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Public site key — safe to ship to the browser; the widget needs it.
export const CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

const CAPTCHA_SECRET = process.env.TURNSTILE_SECRET ?? "";

// Enforced only when BOTH keys are present. That keeps local dev and CI working
// without Cloudflare keys, and doubles as the kill switch if the challenge ever
// has to be turned off in a hurry: unset either key and redeploy.
//
// Both, not just the secret: the browser widget renders only when the site key
// is set, so a secret-without-site-key deployment would send every caller a
// null token and reject it — bricking login, registration and password reset on
// all three auth flows, including the admin panel needed to fix it. A partial
// configuration degrades to "captcha off" rather than "nobody can sign in".
export const captchaEnabled = Boolean(CAPTCHA_SECRET && CAPTCHA_SITE_KEY);

export type CaptchaResult = { ok: true } | { ok: false; error: string; status: number };

// Message shown to a real person who failed the challenge — deliberately vague
// about why, and never surfacing Cloudflare's error codes.
const FAILED_MESSAGE = "Verification failed. Please complete the challenge and try again.";

// Extracts the caller's address for Turnstile's optional remoteip check, which
// ties a token to the client that solved it.
function clientIp(req: Request): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || undefined;
}

// Validates a Turnstile token. Returns ok when the captcha isn't configured, so
// an unconfigured environment behaves exactly as it did before this existed.
export async function verifyCaptcha(token: unknown, req: Request): Promise<CaptchaResult> {
  if (!captchaEnabled) return { ok: true };

  if (typeof token !== "string" || !token.trim()) {
    return { ok: false, error: "Please complete the verification challenge.", status: 400 };
  }

  const form = new URLSearchParams({ secret: CAPTCHA_SECRET, response: token.trim() });
  const ip = clientIp(req);
  if (ip) form.set("remoteip", ip);

  let data: { success?: boolean; "error-codes"?: string[]; hostname?: string };
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    data = await res.json();
  } catch {
    // Fails CLOSED. A captcha that waves everyone through whenever the verifier
    // is unreachable is no barrier at all — an attacker only has to make it
    // unreachable. The cost is that a Cloudflare outage blocks sign-ins; unset
    // TURNSTILE_SECRET to lift the gate if that ever happens.
    return {
      ok: false,
      error: "Couldn't verify the challenge right now. Please try again in a moment.",
      status: 503,
    };
  }

  // Strict identity check, not truthiness: a malformed or unexpected payload
  // must fail rather than pass on a coincidentally truthy value.
  if (data.success !== true) {
    return { ok: false, error: FAILED_MESSAGE, status: 400 };
  }

  return { ok: true };
}
