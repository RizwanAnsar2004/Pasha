import type { NextConfig } from "next";

// Derived from the same env var the app connects with, never hardcoded: the CSP
// and next/image allowlists below have to name whichever Supabase project this
// build actually talks to. Pinning one ref here meant that pointing a deployment
// at the other project (prod vs. the dev clone) left the server rendering fine
// while the browser silently blocked every client-side query, realtime socket,
// and Storage image. Next loads .env* before evaluating this file, so the var is
// available here; the fallback only covers a build with no env at all.
const SUPABASE_HOST = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://ftekdhipoqvbftfybvwz.supabase.co"
).host;

// Cloudflare Turnstile (bot challenge on the auth forms). Needs three
// directives, not one: it loads api.js (script-src), renders the challenge in
// an iframe (frame-src), and calls back to Cloudflare to issue the token
// (connect-src). Miss any of them and the widget fails to appear, with the
// browser reporting only a generic script/frame block.
const TURNSTILE_HOST = "https://challenges.cloudflare.com";

// The unlisted /launch event page plays the launch film in a YouTube iframe.
// Privacy-enhanced mode serves the player from youtube-nocookie.com, but the
// player itself can hand off to www.youtube.com, so frame-src needs both or the
// overlay comes up blank with only a generic frame-block in the console.
const YOUTUBE_HOSTS = "https://www.youtube-nocookie.com https://www.youtube.com";

// Content-Security-Policy designed for: Next.js (inline scripts for hydration),
// Supabase REST/Storage/Realtime, and self-hosted assets.
const csp = [
  `default-src 'self'`,
  // Next inlines hydration scripts. 'unsafe-inline' is required for the
  // bootstrap; consider nonce-based CSP later if we need stricter.
  // Google Analytics (gtag.js) loads from googletagmanager.com.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://www.googletagmanager.com ${TURNSTILE_HOST}`,
  // canvas-confetti renders via a blob: Web Worker when available (falls back
  // to the main thread otherwise) — without this, worker-src falls back to
  // script-src, which doesn't allow blob:, so the browser blocks it.
  `worker-src 'self' blob:`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' data: https://fonts.gstatic.com`,
  // Self-hosted assets (Supabase Storage logos, /public) plus GA's tracking
  // pixel beacons (google-analytics.com / googletagmanager.com).
  // The /hub-launch ceremony page hot-links partner logos and speaker
  // portraits from these hosts. Without them the images are silently blocked
  // and render broken, with only a generic CSP violation in the console.
  // These are stopgaps: see the note in public/hub-launch.html — the assets
  // should be moved into /public so the page stops depending on third-party
  // hosts that can change or expire.
  `img-src 'self' data: blob: https://${SUPABASE_HOST} https://*.google-analytics.com https://*.googletagmanager.com https://www.pasha.org.pk https://encrypted-tbn0.gstatic.com https://www.pakpedia.pk`,
  // Supabase REST/Realtime plus GA4's data-collection endpoints (it POSTs hits
  // to region-specific *.google-analytics.com / *.analytics.google.com hosts).
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com ${TURNSTILE_HOST}`,
  `frame-ancestors 'none'`,
  // The contact page embeds the Secretariat location as a Google Maps iframe;
  // without this, default-src 'self' blocks it.
  `frame-src https://www.google.com https://maps.google.com ${TURNSTILE_HOST} ${YOUTUBE_HOSTS}`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `upgrade-insecure-requests`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

// Unlisted static event pages, served straight from /public.
//
// TO ADD ONE: put <slug>.html in public/ and add the slug here. That is all —
// the rewrite to the clean URL and the noindex header are both derived below.
// TO SWAP THE CONTENT of an existing one: overwrite public/<slug>.html. No
// config change, no rebuild of anything else.
//
// Also add the slug to the disallow list in src/app/robots.ts, which cannot
// import from this file (it is outside the src alias).
const STATIC_EVENT_PAGES: string[] = [];   // in the future if you wanna static pages simply add their slugs here, e.g. ["launch", "hub-launch", "hub-launch.html"]

// Both the clean URL and the underlying .html need the header: the file stays
// directly reachable at /<slug>.html regardless of the rewrite.
const LAUNCH_PATHS = STATIC_EVENT_PAGES.flatMap((slug) => [`/${slug}`, `/${slug}.html`]);

// Belt-and-suspenders against indexing. The HTML carries a robots meta tag too,
// but a crawler that only reads headers (or fetches with HEAD) never sees it.
const noindexHeaders = [
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive, nosnippet, noimageindex",
  },
];

const nextConfig: NextConfig = {
  output:"standalone",
  // Pin the project root so Next doesn't infer the OS home directory as the
  // workspace root (which happens when stray lockfiles exist above this folder)
  // and end up watching/tracing a huge file tree, slowing dev compile + builds.
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // Kept as its own rule with a distinct header key: adding X-Robots-Tag to
      // securityHeaders instead would apply it site-wide, and merging a second
      // Content-Security-Policy here would have the browser enforce the
      // intersection of the two, silently re-blocking the YouTube frame.
      ...LAUNCH_PATHS.map((source) => ({ source, headers: noindexHeaders })),
    ];
  },
  // Serves public/<slug>.html at the clean /<slug> URL the event invites point
  // at. These stay static files rather than app routes because each is a
  // self-contained fullscreen event screen with its own styles and no shared
  // header, footer, or layout — so the HTML can be swapped wholesale.
  async rewrites() {
    return STATIC_EVENT_PAGES.map((slug) => ({
      source: `/${slug}`,
      destination: `/${slug}.html`,
    }));
  },
  // Allow next/image to optimize our own Supabase Storage URLs.
  // Everything else is served from /public on this origin.
  images: {
    remotePatterns: [{ protocol: "https", hostname: SUPABASE_HOST }],
  },
};

export default nextConfig;
