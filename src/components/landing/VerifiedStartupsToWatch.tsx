"use client";

import Link from "next/link";
import { motion, type Variants, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowUpRight, BadgeCheck, ChevronLeft, ChevronRight, MapPin, Sparkles } from "lucide-react";
import { initials } from "@/lib/utils";
import { safeImageSrc } from "@/lib/safe-url";
import { RichText } from "@/components/ui/RichText";
import { useState, useRef, useCallback } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;
const CARDS_PER_PAGE = 3;

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

/**
 * Hero background — the uploaded cover image when present, otherwise the
 * decorative grid + glow + ghost-initial fallback. Falls back gracefully if
 * the image URL is unsafe or fails to load.
 */
function CardCover({ src, name }: { src?: string | null; name: string }) {
  const safe = safeImageSrc(src);
  const [errored, setErrored] = useState(false);
  const showImage = safe && !errored;

  if (showImage) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={safe}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={() => setErrored(true)}
        />
        {/* legibility wash for the badge sitting on top */}
        <div className="absolute inset-0 bg-gradient-to-t from-pasha-ink/20 via-transparent to-transparent" />
        {/* shine on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />
      </>
    );
  }

  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(14,14,16,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(14,14,16,0.04)_1px,transparent_1px)] bg-[size:28px_28px]" />
      <div className="absolute -bottom-6 -left-6 w-40 h-40 rounded-full bg-pasha-red/[0.12] blur-2xl group-hover:bg-pasha-red/[0.20] transition-all duration-500" />
      <div className="absolute -top-4 -right-4 w-28 h-28 rounded-full bg-pasha-red/[0.06] blur-xl" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-serif text-6xl font-bold text-pasha-ink/[0.07] select-none leading-none group-hover:text-pasha-red/[0.10] transition-colors duration-500">
          {initials(name)}
        </span>
      </div>
    </>
  );
}

/**
 * Avatar — the uploaded logo when present, otherwise the startup initials.
 */
function CardLogo({ src, name }: { src?: string | null; name: string }) {
  const safe = safeImageSrc(src);
  const [errored, setErrored] = useState(false);
  const showImage = safe && !errored;

  return (
    <div
      className={`w-14 h-14 rounded-2xl ring-[3px] ring-white border border-pasha-line/30 grid place-items-center overflow-hidden shadow-sm transition-all duration-300 group-hover:scale-105 ${
        showImage
          ? "bg-white"
          : "bg-pasha-ink/[0.07] font-bold text-base text-pasha-ink/60 group-hover:bg-pasha-red/[0.09] group-hover:text-pasha-red group-hover:border-pasha-red/15"
      }`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={safe}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </div>
  );
}

const containerV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const itemV: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

function StartupCard({ startup }: { startup: WatchlistStartup }) {
  return (
    <div className="group relative flex flex-col h-full">
      <div className="relative flex flex-col flex-1 rounded-3xl overflow-hidden border border-pasha-line/50 bg-white shadow-[0_2px_16px_rgba(14,14,16,0.06)] group-hover:shadow-[0_24px_64px_-12px_rgba(14,14,16,0.14)] group-hover:border-pasha-red/20 transition-all duration-500">

        {/* Hero panel */}
        <div className="relative h-36 bg-pasha-stone overflow-hidden shrink-0">
          <CardCover src={startup.cover_image} name={startup.startup_name} />

          {startup.pasha_verified ? (
            <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur border border-pasha-line/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[1.5px] text-pasha-red/80">
              <BadgeCheck className="w-2.5 h-2.5" /> Verified
            </span>
          ) : (
            <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur border border-pasha-line/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[1.5px] text-pasha-ink/40">
              P@SHA
            </span>
          )}
        </div>

        {/* Avatar */}
        <div className="relative z-10 px-5 -mt-7">
          <CardLogo src={startup.logo_url} name={startup.startup_name} />
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 px-5 pt-3 pb-5 gap-1.5">
          <h3 className="font-serif text-xl text-pasha-ink leading-tight group-hover:text-pasha-red transition-colors duration-200">
            {startup.startup_name}
          </h3>

          {startup.tagline && (
            <RichText
              inline
              value={startup.tagline}
              className="mt-1 text-sm text-pasha-muted/70 leading-relaxed line-clamp-2"
            />
          )}

          <div className="flex-1" />

          <div className="mt-3 pt-3 border-t border-pasha-line/40 flex flex-wrap items-center gap-1.5">
            {startup.primary_industry && (
              <span className="inline-flex items-center rounded-full bg-pasha-red/[0.07] border border-pasha-red/12 px-3 py-1 text-xs font-semibold text-pasha-red/75">
                {startup.primary_industry}
              </span>
            )}
            {startup.city && (
              <span className="inline-flex items-center gap-1 rounded-full bg-pasha-ink/[0.04] border border-pasha-line/50 px-3 py-1 text-xs text-pasha-muted/70">
                <MapPin className="w-3 h-3 text-pasha-red/40 shrink-0" />
                {startup.city}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <Link
          href="/directory"
          className="px-5 py-3.5 border-t border-pasha-line/30 group-hover:border-pasha-red/10 bg-pasha-stone/30 group-hover:bg-pasha-red/[0.03] flex items-center justify-between transition-all duration-300 focus-visible:outline-none"
        >
          <span className="text-xs font-semibold text-pasha-muted/50 group-hover:text-pasha-red/60 transition-colors">
            View Profile
          </span>
          <span className="w-7 h-7 rounded-full border border-pasha-line/50 group-hover:border-pasha-red/30 group-hover:bg-pasha-red group-hover:text-white grid place-items-center text-pasha-muted/30 transition-all duration-300">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}

export function VerifiedStartupsToWatch({ startups }: { startups: WatchlistStartup[] }) {
  if (startups.length === 0) return null;

  const shown = startups.slice(0, 9);
  const totalPages = Math.ceil(shown.length / CARDS_PER_PAGE);
  const [page, setPage] = useState(0);
  const dragX = useMotionValue(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback((target: number) => {
    const clamped = Math.max(0, Math.min(totalPages - 1, target));
    setPage(clamped);
  }, [totalPages]);

  const handleDragEnd = useCallback((_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -50) goTo(page + 1);
    else if (info.offset.x > 50) goTo(page - 1);
    animate(dragX, 0, { type: "spring", stiffness: 400, damping: 40 });
  }, [page, goTo, dragX]);

  const pageStartups = shown.slice(page * CARDS_PER_PAGE, (page + 1) * CARDS_PER_PAGE);

  return (
    <section className="relative bg-pasha-stone border-b border-pasha-line py-20 sm:py-28 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-dots opacity-50" />
        <div className="absolute -top-28 -right-24 w-[520px] h-[520px] rounded-full bg-pasha-red/[0.05] blur-[130px] animate-float-slow" />
        <div className="absolute -bottom-32 -left-20 w-[480px] h-[480px] rounded-full bg-pasha-red/[0.03] blur-[130px] animate-float-slower" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12"
        >
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pasha-red/10 ring-1 ring-inset ring-pasha-red/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-pasha-red">
              <Sparkles className="w-3 h-3" />
              Featured Startups
            </span>
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl lg:text-5xl tracking-tight text-pasha-ink text-balance">
              Verified Startups to Watch
            </h2>
            <p className="mt-3 text-pasha-muted text-base leading-relaxed max-w-xl">
              Handpicked by the P@SHA committee — these startups are actively
              seeking investors, pilots, and partnerships.
            </p>
          </div>
          <Link
            href="/directory"
            className="group self-start sm:self-auto inline-flex items-center gap-2 rounded-full border border-pasha-line bg-white/80 backdrop-blur px-5 py-2.5 text-sm font-medium text-pasha-ink shadow-sm hover:border-pasha-red/30 hover:bg-pasha-red hover:text-white hover:shadow-lg transition-all hover:-translate-y-0.5 shrink-0"
          >
            Browse All Startups
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </motion.div>

        {/* Carousel */}
        <div className="relative">
          {/* Track */}
          <motion.div
            ref={trackRef}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.08}
            style={{ x: dragX }}
            onDragEnd={handleDragEnd}
            className="cursor-grab active:cursor-grabbing select-none"
          >
            <motion.div
              key={page}
              variants={containerV}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {pageStartups.map((startup) => (
                <motion.div key={startup.id} variants={itemV}>
                  <StartupCard startup={startup} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Prev / Next arrows */}
          {totalPages > 1 && (
            <>
              <button
                onClick={() => goTo(page - 1)}
                disabled={page === 0}
                aria-label="Previous"
                className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-pasha-line shadow-md grid place-items-center text-pasha-ink/50 hover:text-pasha-red hover:border-pasha-red/30 hover:shadow-lg disabled:opacity-30 disabled:pointer-events-none transition-all duration-200"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => goTo(page + 1)}
                disabled={page === totalPages - 1}
                aria-label="Next"
                className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-pasha-line shadow-md grid place-items-center text-pasha-ink/50 hover:text-pasha-red hover:border-pasha-red/30 hover:shadow-lg disabled:opacity-30 disabled:pointer-events-none transition-all duration-200"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Dot indicators */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Page ${i + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  i === page
                    ? "w-6 h-2 bg-pasha-red"
                    : "w-2 h-2 bg-pasha-ink/15 hover:bg-pasha-red/40"
                }`}
              />
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
