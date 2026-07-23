"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Globe, MapPin, Search } from "lucide-react";
import { initials } from "@/lib/utils";
import { safeImageSrc, safeHref } from "@/lib/validators/safe-url";
import { startupSlug } from "@/lib/utils/slug";
import { RichText } from "@/components/ui/RichText";
import { Kicker } from "./shared/Kicker";
import { Reveal } from "./shared/Reveal";
import { PillButton } from "./shared/PillButton";
import { useHomeSearch } from "./HomeSearchProvider";
import { EMPTY_OPTION_INDEX, resolveOptionLabel, type OptionIndex } from "@/lib/options/resolve";

const EASE = [0.22, 1, 0.36, 1] as const;

export type WatchlistStartup = {
  id: string;
  startup_name: string;
  tagline?: string | null;
  primary_industry?: string | null;
  city?: string | null;
  product_stage?: string | null;
  pasha_verified?: boolean | null;
  logo_url?: string | null;
  cover_image?: string | null;
  website?: string | null;
  company_linkedin?: string | null;
};

const MINI_TINTS = ["#DDF3F3", "#E9E3F3", "#DDF3E9", "#FFF0B9"];

function CardLogo({ src, name }: { src?: string | null; name: string; dark?: boolean }) {
  const safe = safeImageSrc(src);
  const [errored, setErrored] = useState(false);
  const showImage = safe && !errored;
  return (
    <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[22px] border border-pasha-ink/[0.06] bg-white font-bold text-base text-pasha-ink shadow-sm">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={safe}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain"
          onError={() => setErrored(true)}
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </div>
  );
}

// Larger circular variant of CardLogo for the spotlight card's radar panel
// (h-64, rings up to 240px) — CardLogo's 80px box reads too small there.
function SpotlightLogo({ src, name }: { src?: string | null; name: string }) {
  const safe = safeImageSrc(src);
  const [errored, setErrored] = useState(false);
  const showImage = safe && !errored;
  return (
    <div className="relative z-10 grid h-32 w-32 place-items-center overflow-hidden rounded-full border border-pasha-ink/[0.06] bg-white font-bold text-2xl text-pasha-ink shadow-xl">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={safe}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain"
          onError={() => setErrored(true)}
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </div>
  );
}

// Inline brand glyph — lucide 1.x dropped brand icons, so LinkedIn is kept as
// a local SVG (same pattern used across the detail page and directory grid).
function LinkedInGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M20.45 20.45h-3.55v-5.56c0-1.32-.03-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.65H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.61 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 110-4.13 2.06 2.06 0 010 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

// Normalise a stored link into a usable external href — bare domains
// ("acme.com") get https://, anything unsafe or empty resolves to null so the
// link is dropped rather than rendered as a dead "#".
function externalHref(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v || v.toUpperCase() === "NULL") return null;
  const href = safeHref(/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`);
  return href === "#" ? null : href;
}

// Footer links point at the startup's OWN website / LinkedIn. Anything missing
// is dropped; if the startup has neither, we fall back to its profile page so
// the card still leads somewhere meaningful.
function CardFooterLinks({ startup, dark = false }: { startup: WatchlistStartup; dark?: boolean }) {
  const cls = dark
    ? "text-[10px] font-bold text-white hover:text-white/70"
    : "text-[10px] font-bold text-pasha-ink hover:text-pasha-ink/60";
  const linkCls = `inline-flex items-center gap-1.5 transition-colors ${cls}`;

  const website = externalHref(startup.website);
  const linkedin = externalHref(startup.company_linkedin);
  const hasLink = Boolean(website || linkedin);
  const profileHref = `/directory/${startupSlug(startup.startup_name, startup.id)}`;

  return (
    <div
      className={`mt-5 flex items-center justify-between gap-3 border-t pt-4 ${
        dark ? "border-white/15" : "border-pasha-ink/10"
      }`}
    >
      {website && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className={linkCls}
          aria-label={`${startup.startup_name} website (opens in new tab)`}
        >
          <Globe className="h-3.5 w-3.5" aria-hidden />
          Website
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      )}
      {linkedin && (
        <a
          href={linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className={linkCls}
          aria-label={`${startup.startup_name} on LinkedIn (opens in new tab)`}
        >
          <LinkedInGlyph className="h-3.5 w-3.5" />
          LinkedIn
        </a>
      )}
      {!hasLink && (
        <Link href={profileHref} className={linkCls}>
          View profile
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function MiniCard({ startup, tint, optionIndex }: { startup: WatchlistStartup; tint: string; optionIndex: OptionIndex }) {
  const sectorLabel = resolveOptionLabel(optionIndex, "SECTORS", startup.primary_industry);
  return (
    <article
      data-name={startup.startup_name.toLowerCase()}
      data-sector={(sectorLabel ?? "").toLowerCase()}
      data-stage={(startup.product_stage ?? "").toLowerCase()}
      style={{ backgroundColor: tint }}
      className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] p-6 transition-all duration-300 hover:-translate-y-1"
    >
      <div className="flex items-start justify-between gap-3">
        <CardLogo src={startup.logo_url} name={startup.startup_name} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        {sectorLabel && (
          <span className="rounded-full bg-white px-3 py-1.5 text-[9px] font-bold uppercase tracking-[1px] text-pasha-ink">
            {sectorLabel}
          </span>
        )}
        {startup.city && (
          <span className="inline-flex items-center gap-1 text-xs text-pasha-ink/55 shrink-0">
            <MapPin className="h-3 w-3" />
            {startup.city}
          </span>
        )}
      </div>

      <div className="mt-3">
        <h3 className="font-serif text-xl font-bold text-pasha-ink leading-tight">{startup.startup_name}</h3>
        {startup.tagline && (
          <RichText inline value={startup.tagline} className="mt-1.5 text-xs text-pasha-ink/60 leading-relaxed line-clamp-2" />
        )}
      </div>

      <CardFooterLinks startup={startup} />
    </article>
  );
}

function SpotlightCard({ startup, optionIndex }: { startup: WatchlistStartup; optionIndex: OptionIndex }) {
  const sectorLabel = resolveOptionLabel(optionIndex, "SECTORS", startup.primary_industry);
  return (
    <article
      data-name={startup.startup_name.toLowerCase()}
      data-sector={(sectorLabel ?? "").toLowerCase()}
      data-stage={(startup.product_stage ?? "").toLowerCase()}
      className="group relative flex h-full flex-col overflow-hidden rounded-[28px] bg-pasha-ink"
    >
      {/* Logo / radar panel */}
      <div className="relative flex h-64 items-center justify-center overflow-hidden border-b border-white/10">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] bg-[size:22px_22px]" />
          <span className="absolute -bottom-10 -right-10 select-none font-serif font-black text-white/[0.06] leading-none text-[10rem]">
            @
          </span>
        </div>

        <div className="relative grid place-items-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              aria-hidden
              className="absolute rounded-full border border-pasha-red/25"
              style={{ width: `${128 + i * 56}px`, height: `${128 + i * 56}px` }}
            />
          ))}
          <span aria-hidden className="absolute h-28 w-28 rounded-full bg-pasha-red/40 blur-2xl" />
          <SpotlightLogo src={startup.logo_url} name={startup.startup_name} />
        </div>
      </div>

      <div className="relative flex flex-1 flex-col justify-between p-7 sm:p-8">
        <div className="flex items-center justify-between gap-2">
          {sectorLabel && (
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[1px] text-white/70">
              {sectorLabel}
            </span>
          )}
          {startup.city && (
            <span className="inline-flex items-center gap-1 text-xs text-white/45 shrink-0">
              <MapPin className="h-3 w-3" />
              {startup.city}
            </span>
          )}
        </div>

        <div className="mt-6">
          <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-white/40">Featured company</span>
          <h3 className="mt-2 font-serif text-3xl sm:text-4xl font-bold text-white leading-tight">{startup.startup_name}</h3>
          {startup.tagline && (
            <RichText inline value={startup.tagline} className="mt-3 text-white/55 leading-relaxed" />
          )}
        </div>

        <CardFooterLinks startup={startup} dark />
      </div>
    </article>
  );
}

export function DirectoryBento({
  startups,
  optionIndex = EMPTY_OPTION_INDEX,
}: {
  startups: WatchlistStartup[];
  optionIndex?: OptionIndex;
}) {
  const { keyword, sector, stage } = useHomeSearch();

  // Compares against the resolved label so an id filter matches legacy text rows.
  const matches = (stored: string | null | undefined, type: string, param: string) => {
    if (param === "all") return true;
    const raw = (stored ?? "").trim();
    if (!raw) return false;
    if (raw === param) return true;
    const storedLabel = resolveOptionLabel(optionIndex, type, raw);
    const paramLabel = resolveOptionLabel(optionIndex, type, param);
    if (!storedLabel || !paramLabel) return false;
    return storedLabel.toLowerCase() === paramLabel.toLowerCase();
  };

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return startups.filter((s) => {
      if (q) {
        const sectorLabel = resolveOptionLabel(optionIndex, "SECTORS", s.primary_industry) ?? "";
        const haystack = `${s.startup_name} ${sectorLabel} ${s.city ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (!matches(s.primary_industry, "SECTORS", sector)) return false;
      if (!matches(s.product_stage, "STAGES", stage)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startups, keyword, sector, stage, optionIndex]);

  if (startups.length === 0) return null;

  const shown = filtered.slice(0, 5);
  const [spotlight, ...minis] = shown;

  return (
    <section id="directory" className="relative bg-pasha-stone py-20 sm:py-28">
      <div className="site-container">
        <Reveal className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div>
            <Kicker>Featured startups</Kicker>
            <h2 className="mt-4 font-serif text-3xl sm:text-5xl lg:text-5xl font-extrabold tracking-tight text-pasha-ink text-balance">
              Startups worth knowing.
            </h2>
          </div>
          <div className="max-w-md">
            
            <PillButton href="/directory" variant="outline" className="mt-4">
              View all startups
            </PillButton>
          </div>
        </Reveal>

        {shown.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-pasha-ink/15 bg-white/50 px-6 py-16 text-center">
            <Search className="mx-auto h-7 w-7 text-pasha-muted/50" />
            <p className="mt-3 text-pasha-muted">No startups match those filters yet. Try a different sector or stage.</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: EASE }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-5"
          >
            {spotlight && (
              <div className="lg:row-span-2 lg:col-span-1">
                <SpotlightCard startup={spotlight} optionIndex={optionIndex} />
              </div>
            )}
            {minis.map((startup, i) => (
              <MiniCard key={startup.id} startup={startup} tint={MINI_TINTS[i % MINI_TINTS.length]} optionIndex={optionIndex} />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
