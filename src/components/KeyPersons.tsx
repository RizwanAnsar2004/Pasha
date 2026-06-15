import { Star } from "lucide-react";
import { safeHref } from "@/lib/safe-url";
import { initials } from "@/lib/utils";

/**
 * One row in databank.key_persons (mirrors submissions.founders). The detail
 * page renders an array of these as a Y Combinator-style grid.
 */
export type KeyPerson = {
  name?: string;
  role?: string;
  email?: string;
  mobile?: string;
  linkedin?: string;
  x?: string;
  instagram?: string;
  facebook?: string;
  custom_links?: { label?: string; url?: string }[];
  photo_url?: string;
  gender?: string;
  is_primary?: boolean;
};

/**
 * Render the "Key Persons" section on a startup detail page. Designed to
 * gracefully no-op when the array is empty or missing.
 *
 * Grid rules:
 *  - 1 column under 640px (mobile). Horizontal compact cards.
 *  - 2 columns from 640px upward. Detail-page main column tops out around
 *    700px on desktop because of the 280px sidebar; 2-up keeps each card
 *    wide enough to breathe (~330px). A 3-up layout was tested and made
 *    each card claustrophobic at desktop widths.
 */
export function KeyPersons({ persons }: { persons?: KeyPerson[] | null }) {
  if (!persons || !Array.isArray(persons) || persons.length === 0) return null;

  return (
    <section>
      <h2 className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-red">
        Key Persons
      </h2>
      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {persons.map((p, i) => (
          <PersonCard key={`${p.name ?? "anon"}-${i}`} person={p} />
        ))}
      </ul>
    </section>
  );
}

function PersonCard({ person }: { person: KeyPerson }) {
  const name = (person.name ?? "").trim();
  if (!name) return null;
  const role = (person.role ?? "").trim();

  // Build the list of social links. Icon-only — labels live in title attrs
  // + aria-labels. Keeps cards uncluttered when a founder has 4-5 socials.
  const socials: { label: string; href: string; glyph: React.ReactNode }[] = [];
  function push(label: string, raw: string | null | undefined, glyph: React.ReactNode) {
    if (!raw) return;
    const href = safeHref(raw);
    if (href === "#") return;
    socials.push({ label, href, glyph });
  }
  push("LinkedIn", person.linkedin, <LinkedInGlyph className="w-4 h-4" />);
  push("X / Twitter", person.x, <XGlyph className="w-4 h-4" />);
  push("Instagram", person.instagram, <InstagramGlyph className="w-4 h-4" />);
  push("Facebook", person.facebook, <FacebookGlyph className="w-4 h-4" />);
  (person.custom_links ?? []).forEach((cl) => {
    if (!cl?.url) return;
    push(cl.label || "Link", cl.url, <LinkGlyph className="w-4 h-4" />);
  });

  return (
    <li className="group rounded-xl border border-pasha-line bg-white p-4 sm:p-5 flex items-start gap-4 transition-all hover:border-pasha-ink/20 hover:shadow-sm">
      {/* Avatar — 56px on mobile, 64px from sm up. Circular to read as a
          "person", with a subtle border so it doesn't blend into the card
          when the photo is dark or fully white. */}
      <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-pasha-line bg-pasha-stone/50 grid place-items-center overflow-hidden">
        {person.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.photo_url}
            alt={`${name} photo`}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="text-sm sm:text-base font-semibold text-pasha-muted">
            {initials(name)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="flex items-start gap-1.5 text-[15px] font-medium text-pasha-ink leading-tight">
          <span className="break-words">{name}</span>
          {person.is_primary && (
            <Star
              className="w-3.5 h-3.5 mt-0.5 text-pasha-red shrink-0"
              aria-label="Primary contact"
            />
          )}
        </h3>
        {role && (
          <p className="text-[13px] text-pasha-muted mt-1 leading-snug break-words">
            {role}
          </p>
        )}
        {socials.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            {socials.map((s) => (
              <a
                key={`${s.label}-${s.href}`}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${name} on ${s.label}`}
                title={s.label}
                className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-pasha-line bg-white text-pasha-muted hover:border-pasha-red hover:text-pasha-red transition-colors"
              >
                {s.glyph}
              </a>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

// ---- Inline brand glyphs. lucide 1.x dropped brand icons; keeping these
// inline so we don't pull a second icon dep. All monochrome → inherit
// currentColor from the hover-tinted anchor.

function LinkedInGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M20.45 20.45h-3.55v-5.56c0-1.32-.03-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.65H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.61 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 110-4.13 2.06 2.06 0 010 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function XGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25h6.735l4.713 6.231L18.244 2.25z" />
    </svg>
  );
}

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="18" cy="6" r="1" fill="currentColor" />
    </svg>
  );
}

function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.464.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
    </svg>
  );
}

function LinkGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72" />
    </svg>
  );
}
