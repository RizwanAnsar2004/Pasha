"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, MapPin, Search } from "lucide-react";
import { initials } from "@/lib/utils";
import { safeImageSrc } from "@/lib/safe-url";
import { RichText } from "@/components/ui/RichText";
import { Kicker } from "./shared/Kicker";
import { Reveal } from "./shared/Reveal";
import { PillButton } from "./shared/PillButton";
import { useHomeSearch } from "./HomeSearchProvider";

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
};

const MINI_TINTS = ["#DDF3F3", "#E9E3F3", "#DDF3E9", "#FFF0B9"];

function CardLogo({ src, name }: { src?: string | null; name: string; dark?: boolean }) {
  const safe = safeImageSrc(src);
  const [errored, setErrored] = useState(false);
  const showImage = safe && !errored;
  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white font-bold text-sm text-pasha-ink shadow-sm">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={safe}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </div>
  );
}

function CardFooterLinks({ dark = false }: { dark?: boolean }) {
  const cls = dark
    ? "text-[10px] font-bold text-white hover:text-white/70"
    : "text-[10px] font-bold text-pasha-ink hover:text-pasha-ink/60";
  return (
    <div className={`mt-5 flex items-center justify-between border-t pt-4 ${dark ? "border-white/15" : "border-pasha-ink/10"}`}>
      <Link href="/directory" className={`inline-flex items-center gap-1 transition-colors ${cls}`}>
        Website
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
      <Link href="/directory" className={`transition-colors ${cls}`}>
        LinkedIn
      </Link>
    </div>
  );
}

function MiniCard({ startup, tint, index }: { startup: WatchlistStartup; tint: string; index: number }) {
  return (
    <article
      data-name={startup.startup_name.toLowerCase()}
      data-sector={(startup.primary_industry ?? "").toLowerCase()}
      data-stage={(startup.product_stage ?? "").toLowerCase()}
      style={{ backgroundColor: tint }}
      className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] p-6 transition-all duration-300 hover:-translate-y-1"
    >
      <div className="flex items-start justify-between gap-3">
        <CardLogo src={startup.logo_url} name={startup.startup_name} />
        <span className="font-mono text-xs text-pasha-ink/35">{String(index + 2).padStart(2, "0")}</span>
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        {startup.primary_industry && (
          <span className="rounded-full bg-white px-3 py-1.5 text-[9px] font-bold uppercase tracking-[1px] text-pasha-ink">
            {startup.primary_industry}
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

      <CardFooterLinks />
    </article>
  );
}

function SpotlightCard({ startup }: { startup: WatchlistStartup }) {
  return (
    <article
      data-name={startup.startup_name.toLowerCase()}
      data-sector={(startup.primary_industry ?? "").toLowerCase()}
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

        <span className="absolute top-5 right-5 font-mono text-xs text-white/30">01</span>

        <div className="relative grid place-items-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              aria-hidden
              className="absolute rounded-full border border-pasha-red/25"
              style={{ width: `${96 + i * 56}px`, height: `${96 + i * 56}px` }}
            />
          ))}
          <span aria-hidden className="absolute h-24 w-24 rounded-full bg-pasha-red/40 blur-2xl" />
          <div className="relative grid h-20 w-20 place-items-center rounded-2xl bg-white font-serif text-lg font-bold text-pasha-ink shadow-xl">
            {initials(startup.startup_name)}
            <span aria-hidden className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-pasha-red ring-2 ring-pasha-ink" />
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col justify-between p-7 sm:p-8">
        <div className="flex items-center justify-between gap-2">
          {startup.primary_industry && (
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[1px] text-white/70">
              {startup.primary_industry}
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

        <CardFooterLinks dark />
      </div>
    </article>
  );
}

export function DirectoryBento({ startups }: { startups: WatchlistStartup[] }) {
  const { keyword, sector, stage } = useHomeSearch();

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return startups.filter((s) => {
      if (q) {
        const haystack = `${s.startup_name} ${s.primary_industry ?? ""} ${s.city ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (sector !== "all" && s.primary_industry?.toLowerCase() !== sector.toLowerCase()) return false;
      if (stage !== "all" && !(s.product_stage ?? "").toLowerCase().includes(stage.toLowerCase())) return false;
      return true;
    });
  }, [startups, keyword, sector, stage]);

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
                <SpotlightCard startup={spotlight} />
              </div>
            )}
            {minis.map((startup, i) => (
              <MiniCard key={startup.id} startup={startup} tint={MINI_TINTS[i % MINI_TINTS.length]} index={i} />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
