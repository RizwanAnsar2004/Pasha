// Defense-in-depth: even though the schema rejects unsafe URL schemes, all
// admin-rendered <a href> and <img src> values pass through safeHref() to
// guard against any historical bad data that may have been stored before the
// schema tightened.

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

export function safeHref(url: string | null | undefined): string {
  if (!url) return "#";
  const trimmed = String(url).trim();
  if (!trimmed) return "#";
  try {
    const parsed = new URL(trimmed);
    if (!SAFE_PROTOCOLS.has(parsed.protocol)) return "#";
    return parsed.toString();
  } catch {
    // Not a parseable URL — refuse to render
    return "#";
  }
}

export function safeImageSrc(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = String(url).trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    // Images: only http/https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}
