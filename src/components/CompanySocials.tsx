import { safeHref } from "@/lib/safe-url";

/**
 * Small icon-link row for a startup's social presence. Renders inline in
 * the detail-page hero next to the website link. Skips any URL that fails
 * the safe-href check (defense in depth).
 *
 * Pass only the URLs we have — undefined / "NULL" / empty strings render
 * nothing. Brand glyphs are inline SVGs because lucide-react 1.x dropped
 * brand icons; keeping them inline avoids pulling in another icon dep.
 */
export function CompanySocials({
  linkedin,
  x,
  instagram,
  facebook,
  youtube,
}: {
  linkedin?: string | null;
  x?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  youtube?: string | null;
}) {
  const items: { url: string; label: string; svg: React.ReactNode }[] = [];
  if (clean(linkedin)) items.push({ url: clean(linkedin)!, label: "LinkedIn", svg: <LinkedInIcon /> });
  if (clean(x)) items.push({ url: clean(x)!, label: "X", svg: <XIcon /> });
  if (clean(instagram)) items.push({ url: clean(instagram)!, label: "Instagram", svg: <InstagramIcon /> });
  if (clean(facebook)) items.push({ url: clean(facebook)!, label: "Facebook", svg: <FacebookIcon /> });
  if (clean(youtube)) items.push({ url: clean(youtube)!, label: "YouTube", svg: <YouTubeIcon /> });

  if (items.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-3">
      {items.map(({ url, label, svg }) => (
        <a
          key={label}
          href={safeHref(url)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${label} (opens in new tab)`}
          title={label}
          className="text-pasha-muted hover:text-pasha-red transition-colors"
        >
          {svg}
        </a>
      ))}
    </span>
  );
}

function clean(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s.toUpperCase() === "NULL") return null;
  return s;
}

// ---- Inline brand glyphs (16px). Single-color so they inherit currentColor.

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.55v-5.56c0-1.32-.03-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.65H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.61 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 110-4.13 2.06 2.06 0 010 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25h6.735l4.713 6.231L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="18" cy="6" r="1" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.464.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
