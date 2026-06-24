import { cn } from "@/lib/utils";
import { sanitizeHtml, hasContent, looksLikeHtml, htmlToText } from "@/lib/sanitize-html";

/**
 * Renders a value that may be either plain text or rich HTML (e.g. a CKEditor
 * tagline/description). Decides per-value, not per-field-type, so it's safe
 * even if the form field's input_type changes or rows hold legacy plain text:
 *   - HTML  → sanitized + rendered (block tags flattened inline via CSS)
 *   - text  → rendered as-is
 * Returns null when there's nothing meaningful to show.
 *
 * Isomorphic (no client hooks) — usable in both server and client components.
 */
export function RichText({
  value,
  className,
  inline = false,
}: {
  value: string | null | undefined;
  className?: string;
  /** Flatten to a single line (for tight cards). Default renders full block
   *  formatting (headings, lists, paragraphs) — matching the editor. */
  inline?: boolean;
}) {
  if (!value) return null;

  if (looksLikeHtml(value)) {
    const html = sanitizeHtml(value);
    if (!hasContent(html)) return null;
    return (
      <div
        className={cn(inline ? "rich-text-inline" : "rich-text", className)}
        // Sanitized above via the allowlist in sanitize-html.ts.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const text = value.trim();
  if (!text) return null;
  return <div className={className}>{text}</div>;
}

// Re-export so callers needing the plain-text form (search, <meta>) have one
// import site.
export { htmlToText };
