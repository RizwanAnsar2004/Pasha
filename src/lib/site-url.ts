/**
 * Canonical public origin, used for request-independent absolute URLs
 * (metadataBase, robots.txt, sitemap.xml). Set NEXT_PUBLIC_SITE_URL per
 * environment; the fallback only exists so a missing env var doesn't crash
 * the build, and is not a domain anything should actually serve from.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pasha-startup-platform.vercel.app";

/**
 * Public origin of the incoming request, for building absolute links (e.g. email
 * CTAs). Honors the reverse-proxy forwarded headers (VPS + nginx) so links use
 * the real public host instead of nginx's internal upstream, and falls back to
 * the request URL (Vercel / direct hits, where these headers may be absent).
 */
export function requestOrigin(req: Request): string {
  const fwdHost = req.headers.get("x-forwarded-host");
  if (fwdHost) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    // x-forwarded-host can be a comma-separated chain; the first entry is the
    // original client-facing host.
    const host = fwdHost.split(",")[0].trim();
    return `${proto}://${host}`;
  }
  return new URL(req.url).origin;
}
