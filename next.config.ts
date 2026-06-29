import type { NextConfig } from "next";

const SUPABASE_HOST = "ftekdhipoqvbftfybvwz.supabase.co";

// Content-Security-Policy designed for: Next.js (inline scripts for hydration),
// Supabase REST/Storage/Realtime, and self-hosted assets.
const csp = [
  `default-src 'self'`,
  // Next inlines hydration scripts. 'unsafe-inline' is required for the
  // bootstrap; consider nonce-based CSP later if we need stricter.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' data: https://fonts.gstatic.com`,
  // All images are self-hosted (Supabase Storage for databank logos,
  // /public for site assets). No third-party image hosts allowed.
  `img-src 'self' data: blob: https://${SUPABASE_HOST}`,
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST}`,
  `frame-ancestors 'none'`,
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
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Pin the project root so Next doesn't infer the OS home directory as the
  // workspace root (which happens when stray lockfiles exist above this folder)
  // and end up watching/tracing a huge file tree, slowing dev compile + builds.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  // Allow next/image to optimize our own Supabase Storage URLs.
  // Everything else is served from /public on this origin.
  images: {
    remotePatterns: [{ protocol: "https", hostname: SUPABASE_HOST }],
  },
};

export default nextConfig;
