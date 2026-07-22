// Canonical public origin, used for every link handed to a browser or an inbox:
// auth-callback redirects and outgoing email.
//
// Never derived from the incoming request. `x-forwarded-host` is caller-supplied,
// so deriving it would let someone send a real applicant an email from our domain
// pointing at theirs. `request.url` is no better — `next start` builds it from the
// bind address, which behind nginx is the internal 0.0.0.0:PORT, not the domain.

const CANONICAL_SITE_URL = "https://startups.pasha.org.pk";
const DEV_SITE_URL = "http://localhost:3000";

// Bind/loopback addresses that can never be a valid public origin.
const LOOPBACK_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1?\])(:\d+)?$/i;

function normalizeOrigin(value: string | undefined): string {
  return (value ?? "").trim().replace(/\/+$/, "");
}

// SITE_URL is read at runtime (server-only) so a bad value is fixable with a
// restart; NEXT_PUBLIC_SITE_URL is inlined at build time and needs a rebuild.
// A loopback value in production means a misconfigured build — honouring it
// would point password resets at the server itself, so it is ignored.
function resolveSiteUrl(): string {
  const inProduction = process.env.NODE_ENV === "production";
  for (const candidate of [process.env.SITE_URL, process.env.NEXT_PUBLIC_SITE_URL]) {
    const origin = normalizeOrigin(candidate);
    if (!origin) continue;
    if (inProduction && LOOPBACK_ORIGIN.test(origin)) continue;
    return origin;
  }
  return inProduction ? CANONICAL_SITE_URL : DEV_SITE_URL;
}

export const SITE_URL = resolveSiteUrl();

// Origin for links inside outgoing email.
export function emailOrigin(): string {
  return SITE_URL;
}
