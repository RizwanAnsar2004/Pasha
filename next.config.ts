import type { NextConfig } from "next";

const SUPABASE_HOST = "ftekdhipoqvbftfybvwz.supabase.co";

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
  `img-src 'self' data: blob: https://${SUPABASE_HOST} https://*.google-analytics.com https://*.googletagmanager.com`,
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

// Paths that serve the unlisted launch page. /launch is the public-facing URL;
// /launch.html is the file it rewrites to, and is reachable directly, so both
// need the header.
const LAUNCH_PATHS = ["/launch", "/launch.html"];

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
  // Serves public/launch.html at the clean /launch URL the event invites point
  // at. It stays a static file rather than an app route because it is a
  // self-contained fullscreen event screen with its own styles and no shared
  // header, footer, or layout.
  async rewrites() {
    return [{ source: "/launch", destination: "/launch.html" }];
  },
  // Allow next/image to optimize our own Supabase Storage URLs.
  // Everything else is served from /public on this origin.
  images: {
    remotePatterns: [{ protocol: "https", hostname: SUPABASE_HOST }],
  },
};

export default nextConfig;
