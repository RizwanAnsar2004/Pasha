// Allowlist-based HTML sanitizer for user-generated rich text imported from

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "del",
  "ul", "ol", "li",
  "a",
  "blockquote",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "code", "pre",
  "hr",
  "span",
]);

// Only these attrs survive per tag.
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href"]),
};

function isSafeHref(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("mailto:") ||
    v.startsWith("/")
  );
}

// Sanitize an HTML string by walking tag tokens. Cheap regex-driven approach
export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";
  const src = String(input);

  // Strip <script>, <style>, <iframe>, <object>, <embed> blocks entirely
  let out = src
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, "")
    .replace(/<object\b[^>]*>[\s\S]*?<\/object\s*>/gi, "")
    .replace(/<embed\b[^>]*>[\s\S]*?<\/embed\s*>/gi, "")
    // Comments (no XSS risk but cluttered)
    .replace(/<!--[\s\S]*?-->/g, "");

  // Walk each tag and either keep it (with filtered attrs) or strip it.
  out = out.replace(/<\/?([a-z][a-z0-9]*)([^>]*)>/gi, (full, rawName: string, rawAttrs: string) => {
    const name = rawName.toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return "";
    const isClosing = full.startsWith("</");
    if (isClosing) return `</${name}>`;

    const allowed = ALLOWED_ATTRS[name];
    if (!allowed) return `<${name}>`;

    const keptAttrs: string[] = [];
    const attrRe = /\s+([a-z_:][a-z0-9_:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
    let m: RegExpExecArray | null;
    while ((m = attrRe.exec(rawAttrs)) !== null) {
      const attrName = m[1].toLowerCase();
      if (attrName.startsWith("on")) continue;
      if (!allowed.has(attrName)) continue;
      const value = (m[2] ?? m[3] ?? m[4] ?? "").trim();
      if (attrName === "href") {
        if (!isSafeHref(value)) continue;
        keptAttrs.push(`href="${escapeAttr(value)}"`);
      } else {
        keptAttrs.push(`${attrName}="${escapeAttr(value)}"`);
      }
    }
    // Anchor: always force target+rel for safety + ux
    if (name === "a") {
      const hasHref = keptAttrs.some((a) => a.startsWith("href="));
      if (!hasHref) return ""; // anchor with no safe href → drop entirely
      keptAttrs.push('target="_blank"', 'rel="noopener noreferrer nofollow"');
    }
    return keptAttrs.length ? `<${name} ${keptAttrs.join(" ")}>` : `<${name}>`;
  });

  return out;
}

function escapeAttr(v: string): string {
  return v.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// True if sanitized HTML has any meaningful text content (not just <p></p>).
export function hasContent(html: string): boolean {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").trim().length > 0;
}

// Heuristic: does this string contain HTML markup? Used so callers can decide
export function looksLikeHtml(value: string | null | undefined): boolean {
  if (!value) return false;
  return /<\/?[a-z][\s\S]*?>|&[a-z]+;|&#\d+;/i.test(value);
}

// Strip HTML to a clean single string of text — for plain-text consumers
export function htmlToText(value: string | null | undefined): string {
  if (!value) return "";
  return String(value)
    .replace(/<\/?(p|div|br|li|h[1-6]|blockquote|tr)\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}
