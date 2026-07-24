/**
 * Shared link-preview (Open Graph / Twitter Card) defaults.
 *
 * WHY THIS FILE EXISTS
 * Next.js merges metadata *shallowly*. A route that declares
 *
 *   openGraph: { title: "Directory · PASHA Startup Hub", url: "/directory" }
 *
 * does not inherit the root layout's `images` — it replaces the whole
 * `openGraph` object, so the page ships with no og:image at all. The same
 * applies to `twitter`: overriding just the title drops `card`, `site`,
 * `creator` and `images`, which silently downgrades the X card from
 * `summary_large_image` to a small `summary`.
 *
 * Both failures are invisible in the app itself — the page looks fine, and you
 * only find out when someone shares the link. So any route that overrides
 * `openGraph` or `twitter` must spread these back in:
 *
 *   openGraph: { title, url, images: [OG_IMAGE] },
 *   twitter:   { ...TWITTER_DEFAULTS, title },
 */

/**
 * 1200x630 is the ratio LinkedIn, X, Slack, Discord and iMessage render as a
 * full-width card. The declared width/height must keep matching the real file —
 * unfurlers trust these numbers.
 *
 * WhatsApp is the exception: it renders this link as a small square thumbnail
 * and centre-crops to get there, verified on mobile and desktop against a fresh
 * cache key. The card is therefore composed centred, inside the middle 630x630,
 * so it survives that crop intact. Keep any redesign inside that square.
 *
 * The `-v2` suffix is deliberate. Facebook/WhatsApp, LinkedIn and X cache the
 * preview against the image's own URL for days, so editing the PNG in place
 * leaves everyone looking at the old art — a new filename is the only reliable
 * way to force a refetch. Bump the suffix here and in
 * scripts/generate-og-image.js together whenever the card is redesigned.
 *
 * Regenerate the file with: node scripts/generate-og-image.js
 */
// Not `as const`: Next's Metadata types want mutable arrays, and a readonly
// tuple fails to assign to OGImage[] / TwitterImage[].
export const OG_IMAGE = {
  url: "/og-image-v2.png",
  width: 1200,
  height: 630,
  alt: "PASHA Startup Hub — Pakistan's curated network of product-native startups",
  type: "image/png",
};

export const TWITTER_DEFAULTS = {
  card: "summary_large_image" as const,
  site: "@PASHAORG",
  creator: "@PASHAORG",
  images: [OG_IMAGE.url],
};
