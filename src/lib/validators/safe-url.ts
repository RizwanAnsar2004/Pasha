// Defense-in-depth: even though the schema rejects unsafe URL schemes, all

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
