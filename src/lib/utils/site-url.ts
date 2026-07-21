// Canonical public origin. Always env-driven so links are identical regardless
// of which host served the request.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://startups.pasha.org.pk"
).replace(/\/$/, "");

// Origin for links inside outgoing email. Deliberately ignores the request:
// x-forwarded-host is caller-supplied, so deriving it would let someone send a
// real applicant an email from our domain pointing at theirs.
export function emailOrigin(): string {
  return SITE_URL;
}
