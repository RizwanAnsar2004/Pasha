/**
 * Generates public/og-image-v2.png — the link-preview card used by WhatsApp,
 * LinkedIn, X, Slack and iMessage.
 *
 *   node scripts/generate-og-image.js
 *
 * WHY 1200x630 SPECIFICALLY
 * The previous card was 1500x375 (4:1). Every major unfurler treats that as
 * "not a preview image": WhatsApp and LinkedIn fall back to the small square
 * thumbnail and centre-crop it, which reduced the banner to an unreadable slice
 * of the middle. 1200x630 (1.91:1) is the ratio they all render at full width,
 * and it is what og:image:width/height in src/app/layout.tsx declare.
 *
 * The design is deliberately sparse. A preview card is often rendered ~320px
 * wide in a chat list, so anything smaller than the subheading here is
 * illegible at delivery size — this is not a place to reuse the print banner.
 *
 * Fonts are resolved by name from the OS. Arial/Arial Black exist on every
 * Windows and macOS box; the output PNG is committed, so this script only needs
 * to run when the card design changes, not on every build.
 */

const path = require("path");
const fs = require("fs/promises");
const sharp = require(path.join(__dirname, "..", "node_modules", "sharp"));

const WIDTH = 1200;
const HEIGHT = 630;
const PAD = 84;

// Facebook/WhatsApp, LinkedIn and X cache preview images against the image URL
// itself, not just the page URL, and hold them for days. Editing og-image.png
// in place therefore leaves everyone looking at the old art. Bumping this
// filename is what actually forces a refetch — raise the suffix whenever the
// card is redesigned, and update OG_IMAGE.url in src/lib/utils/og.ts to match.
const OUT = path.join(__dirname, "..", "public", "og-image-v2.png");

// The previous filename is still written with the current art. Anything that
// already cached /og-image.png (or hardcodes it) then resolves to the same
// up-to-date card instead of 404ing or serving the superseded design.
const LEGACY_OUT = path.join(__dirname, "..", "public", "og-image.png");
// The vector wordmark, not logo-dark.png — that raster has no alpha channel
// (channels: 3, isOpaque: true), so compositing it here paints a white box
// around the mark. The SVG carries the white-on-dark fills we need.
const LOGO = path.join(__dirname, "..", "public", "pasha-logo-dark.svg");

// Brand palette, mirrored from --color-pasha-* in src/app/globals.css and the
// themeColor in src/app/layout.tsx.
const RED = "#E92127";
const INK = "#07090d";

// The lockup is the hero of the card, not a corner mark — same logo the site
// header renders (components/PashaLogo.tsx), in its white-on-dark variant.
// 430px keeps it well inside the 630px centre square that WhatsApp crops to,
// while still filling the full-width card.
const LOGO_WIDTH = 430;
// From the asset's own viewBox ("4.5 131.8 832.9 332.3").
const LOGO_ASPECT = 832.9 / 332.3;
const LOGO_HEIGHT = Math.round(LOGO_WIDTH / LOGO_ASPECT);
// Whole stack (logo -> rule -> tagline -> URL) is optically centred vertically.
const LOGO_TOP = 144;

// XML-escapes text before it goes into the SVG. "&" in particular appears in
// "Startup & Entrepreneurship Committee" and would produce invalid XML.
const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Layer 1 — gradients only.
//
// librsvg dithers gradients, and at the bloom's hot centre the dither pattern
// clumps into a visible speckled blob. Rendering the gradients alone lets us
// blur that noise away without touching the text, which has to stay crisp; the
// blur is imperceptible on a field this smooth.
const backgroundLayer = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <!-- Warm red bloom off the right edge, echoing the launch button's aura.
         Centred past the right edge so its brightest point sits off-canvas and
         the visible falloff stays even. -->
    <radialGradient id="bloom" cx="88%" cy="40%" r="66%">
      <stop offset="0%"   stop-color="${RED}" stop-opacity=".34"/>
      <stop offset="45%"  stop-color="${RED}" stop-opacity=".12"/>
      <stop offset="100%" stop-color="${RED}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#0d1118"/>
      <stop offset="100%" stop-color="${INK}"/>
    </linearGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#base)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bloom)"/>
</svg>`;

// Layer 2 — everything that must stay sharp, over a transparent canvas.
//
// CENTRED ON PURPOSE — DO NOT LEFT-ALIGN THIS.
// WhatsApp renders this link as a small square thumbnail rather than a
// full-width card, and it gets there by centre-cropping: it keeps the middle
// HEIGHT x HEIGHT square and throws the rest away. Verified against the live
// URL and against a fresh cache key (?v=2), on both mobile and desktop, so it
// is the layout WhatsApp actually chooses here, not a stale preview.
//
// An earlier left-aligned version put the logo and headline outside that
// square, so the thumbnail was a meaningless slice reading "HA / tup Hub".
// Every element below is therefore centred inside SAFE_LEFT..SAFE_RIGHT, which
// keeps the card readable in both renderings: full 1.91:1 card where platforms
// support it, intact brand tile where they crop.
const SAFE_LEFT = (WIDTH - HEIGHT) / 2; // 285
const SAFE_RIGHT = SAFE_LEFT + HEIGHT; // 915
const MID = WIDTH / 2;

const foregroundLayer = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="${RED}" stop-opacity="0"/>
      <stop offset="50%"  stop-color="${RED}" stop-opacity=".95"/>
      <stop offset="100%" stop-color="${RED}" stop-opacity="0"/>
    </linearGradient>
    <pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse">
      <path d="M34 0H0V34" fill="none" stroke="#ffffff" stroke-opacity=".030" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grid)"/>

  <!-- Orbit rings, centred so the square crop looks composed rather than
       sliced. The outer rings run off the sides by design. -->
  <g fill="none" stroke="${RED}" stroke-opacity=".16">
    <circle cx="${MID}" cy="300" r="196"/>
    <circle cx="${MID}" cy="300" r="278" stroke-opacity=".10"/>
    <circle cx="${MID}" cy="300" r="372" stroke-opacity=".06"/>
  </g>
  <g fill="${RED}">
    <circle cx="${MID}" cy="104" r="5" fill-opacity=".80"/>
    <circle cx="${MID - 278}" cy="300" r="4" fill-opacity=".45"/>
    <circle cx="${MID + 278}" cy="300" r="4" fill-opacity=".45"/>
  </g>

  <!-- The logo lockup is composited into the gap above (see main()), occupying
       y ${LOGO_TOP}..${LOGO_TOP + LOGO_HEIGHT}. -->

  <line x1="${MID - 130}" y1="372" x2="${MID + 130}" y2="372" stroke="url(#rule)" stroke-width="3"/>

  <text x="${MID}" y="420" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="25" fill="#ffffff" fill-opacity=".74">${esc(
          "Pakistan's curated startup network"
        )}</text>

  <text x="${MID}" y="486" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="21" font-weight="bold" letter-spacing="1.2"
        fill="#ffffff" fill-opacity=".82">startups.pasha.org.pk</text>
</svg>`;

async function main() {
  // High density so the vector rasterises above its final size and downsamples
  // cleanly; at 1x the wordmark's thin strokes alias badly.
  const logo = await sharp(LOGO, { density: 600 })
    .resize({ width: LOGO_WIDTH, fit: "inside" })
    .png()
    .toBuffer();

  // Two passes rather than one chained pipeline: the blur has to land on the
  // gradients before anything sharp is composited over them.
  const base = await sharp(Buffer.from(backgroundLayer))
    .blur(2)
    .png()
    .toBuffer();

  const card = await sharp(base)
    .composite([
      { input: Buffer.from(foregroundLayer) },
      // Centred horizontally so it survives the square crop intact.
      {
        input: logo,
        top: LOGO_TOP,
        left: Math.round((WIDTH - LOGO_WIDTH) / 2),
      },
    ])
    // Flattened onto the ink base: a transparent PNG renders on a white card in
    // some clients, which would blow out the white headline text.
    .flatten({ background: INK })
    .png({ quality: 92, compressionLevel: 9 })
    .toBuffer();

  await fs.writeFile(OUT, card);
  await fs.writeFile(LEGACY_OUT, card);

  const info = await sharp(card).metadata();
  const size = `${info.width}x${info.height}  ${(card.length / 1024).toFixed(1)} KB`;
  console.log(`${path.basename(OUT)}  ${size}`);
  console.log(`${path.basename(LEGACY_OUT)}  ${size}  (legacy alias)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
