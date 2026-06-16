// URL slug helpers for /directory/[slug] detail pages.
//
// Format: `slugify(name)-{first8charsOfId}` so URLs stay readable and unique.
// Example: Bykea (id d8a1b9c0-e580-…) → `bykea-d8a1b9c0`.
//
// We never trust the slug; on the server we extract the trailing 8-hex token
// and look up the row by id-prefix. The name portion is decorative.

export function slugify(input: string | null | undefined): string {
  if (!input) return "startup";
  return String(input)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "startup";
}

export function startupSlug(name: string | null | undefined, id: string): string {
  const head = slugify(name);
  const tail = (id || "").replace(/-/g, "").slice(0, 8).toLowerCase();
  return `${head}-${tail}`;
}

/** Same pattern as startupSlug — used for /events/[slug] detail URLs. */
export function eventSlug(title: string | null | undefined, id: string): string {
  return startupSlug(title, id);
}

/**
 * Parse the trailing 8-hex id prefix out of a slug. Returns null if the slug
 * doesn't end in 8 hex chars (e.g. someone hand-typed `/directory/bykea`).
 */
export function idPrefixFromSlug(slug: string): string | null {
  const m = String(slug || "").match(/-([a-f0-9]{8})$/i);
  return m ? m[1].toLowerCase() : null;
}
