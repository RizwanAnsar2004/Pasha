"use client";

import Link from "next/link";
import { motion, type Variants, useMotionValue, animate } from "framer-motion";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Globe, Mail, MapPin, Phone, Sparkles, Users } from "lucide-react";
import { initials, formatNumber } from "@/lib/utils";
import { safeImageSrc } from "@/lib/safe-url";
import { RichText } from "@/components/ui/RichText";
import { useState, useRef, useCallback } from "react";
import { usePageReady } from "@/components/PageReady";
import type { WomenLedStartup } from "@/lib/women-led";

const EASE = [0.22, 1, 0.36, 1] as const;
const CARDS_PER_PAGE = 3;

export type WomenFounderStartup = WomenLedStartup;

function cleanUrl(url?: string | null) {
  if (!url || url.toLowerCase() === "none" || !url.trim()) return null;
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * Hero background — the uploaded cover image when present, otherwise the
 * decorative grid + glow + ghost-initial fallback.
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
        <div className="absolute inset-0 bg-gradient-to-t from-pasha-ink/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />
      </>
    );
  }

  return (
    <>
      {/* Grid texture */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(14,14,16,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(14,14,16,0.04)_1px,transparent_1px)] bg-[size:28px_28px]" />
      {/* Red radial glow */}
      <div className="absolute -bottom-6 -left-6 w-40 h-40 rounded-full bg-pasha-red/[0.12] blur-2xl group-hover:bg-pasha-red/[0.20] transition-all duration-500" />
      <div className="absolute -top-4 -right-4 w-28 h-28 rounded-full bg-pasha-red/[0.06] blur-xl" />
      {/* Shine on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />
      {/* Large initial — centred in hero */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-serif text-6xl font-bold text-pasha-ink/[0.07] select-none leading-none group-hover:text-pasha-red/[0.10] transition-colors duration-500">
          {initials(name)}
        </span>
      </div>
    </>
  );
}

/** Avatar — the uploaded logo when present, otherwise the startup initials. */
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

function FounderCard({ startup }: { startup: WomenLedStartup }) {
  return (
    <div className="group relative flex flex-col h-full">
      <Link href={`/directory/${startup.slug}`} className="absolute inset-0 z-20 rounded-3xl focus-visible:outline-none" />

      <div className="relative flex flex-col flex-1 rounded-3xl overflow-hidden border border-pasha-line/50 bg-white shadow-[0_2px_16px_rgba(14,14,16,0.06)] group-hover:shadow-[0_24px_64px_-12px_rgba(14,14,16,0.14)] group-hover:border-pasha-red/20 transition-all duration-500">

        {/* Hero panel */}
        <div className="relative h-36 bg-pasha-stone overflow-hidden shrink-0">
          <CardCover src={startup.cover_image} name={startup.startup_name} />

          <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur border border-pasha-line/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[1.5px] text-pasha-red/80">
            <Users className="w-2.5 h-2.5" /> Women Led
          </span>
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

          {startup.founder_name && (
            <p className="text-sm text-pasha-muted font-medium">{startup.founder_name}</p>
          )}

          {startup.tagline && (
            <RichText
              inline
              value={startup.tagline}
              className="mt-1 text-sm text-pasha-muted/70 leading-relaxed line-clamp-2"
            />
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
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

          <div className="flex-1" />

          {(startup.contact_email || startup.founder_mobile || cleanUrl(startup.website)) && (
            <div className="mt-3 pt-3 border-t border-pasha-line/40 space-y-2">
              {startup.contact_email && (
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-md bg-pasha-red/[0.08] border border-pasha-red/10 grid place-items-center shrink-0">
                    <Mail className="w-3 h-3 text-pasha-red/60" />
                  </span>
                  <span className="text-xs text-pasha-muted/70 truncate">{startup.contact_email}</span>
                </div>
              )}
              {startup.founder_mobile && (
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-md bg-pasha-red/[0.08] border border-pasha-red/10 grid place-items-center shrink-0">
                    <Phone className="w-3 h-3 text-pasha-red/60" />
                  </span>
                  <span className="text-xs text-pasha-muted/70 truncate">{startup.founder_mobile}</span>
                </div>
              )}
              {cleanUrl(startup.website) && (
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-md bg-pasha-red/[0.08] border border-pasha-red/10 grid place-items-center shrink-0">
                    <Globe className="w-3 h-3 text-pasha-red/60" />
                  </span>
                  <span className="text-xs text-pasha-muted/70 truncate">{cleanUrl(startup.website)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-3.5 border-t border-pasha-line/30 group-hover:border-pasha-red/10 bg-pasha-stone/30 group-hover:bg-pasha-red/[0.03] flex items-center justify-between transition-all duration-300">
          <span className="text-xs font-semibold text-pasha-muted/50 group-hover:text-pasha-red/60 transition-colors">
            View Profile
          </span>
          <span className="w-7 h-7 rounded-full border border-pasha-line/50 group-hover:border-pasha-red/30 group-hover:bg-pasha-red group-hover:text-white grid place-items-center text-pasha-muted/30 transition-all duration-300">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function WomenFounders({
  startups,
  totalCount,
}: {
  startups: WomenFounderStartup[];
  totalCount: number;
}) {
  if (startups.length === 0) return null;

  const shown = startups.slice(0, 9);
  const remaining = Math.max(totalCount - shown.length, 0);

  // Build pages: each page has up to CARDS_PER_PAGE cards; last page may include "+remaining" slot
  const cardSlots: Array<WomenLedStartup | "more"> = [...shown, ...(remaining > 0 ? (["more"] as const) : [])];
  const totalPages = Math.ceil(cardSlots.length / CARDS_PER_PAGE);

  const [page, setPage] = useState(0);
  const dragX = useMotionValue(0);
  const trackRef = useRef<HTMLDivElement>(null);
  // Hold the on-mount card reveal until the intro loader has faded, so it isn't
  // played (and wasted) behind the overlay.
  const ready = usePageReady();

  const goTo = useCallback((target: number) => {
    const clamped = Math.max(0, Math.min(totalPages - 1, target));
    setPage(clamped);
  }, [totalPages]);

  const handleDragEnd = useCallback((_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -50) goTo(page + 1);
    else if (info.offset.x > 50) goTo(page - 1);
    animate(dragX, 0, { type: "spring", stiffness: 400, damping: 40 });
  }, [page, goTo, dragX]);

  const pageSlots = cardSlots.slice(page * CARDS_PER_PAGE, (page + 1) * CARDS_PER_PAGE);

  return (
    <section className="relative bg-white border-b border-pasha-line py-20 sm:py-28 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full bg-pasha-red/[0.04] blur-[130px] animate-float-slow" />
        <div className="absolute -bottom-28 right-1/4 w-[460px] h-[460px] rounded-full bg-pasha-red/[0.03] blur-[130px] animate-float-slower" />
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
              Women-Led Startups
            </span>
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl lg:text-5xl tracking-tight text-pasha-ink text-balance">
              Celebrating Pakistan&apos;s{" "}
              <span className="text-pasha-red">Women Founders</span>
            </h2>
            <p className="mt-3 text-pasha-muted text-base leading-relaxed max-w-xl">
              {formatNumber(totalCount)} women-led startups registered on the P@SHA directory —
              spotlighted, supported, and connected with targeted opportunities.
            </p>
          </div>
          <Link
            href="/directory?women_led=true"
            className="group self-start sm:self-auto inline-flex items-center gap-2 rounded-full bg-pasha-red px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-pasha-red/20 hover:bg-pasha-red-dark hover:shadow-pasha-red/30 hover:shadow-md hover:-translate-y-0.5 transition-all shrink-0"
          >
            Explore Women Founders
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {/* Carousel */}
        <div className="relative">
          {/* Draggable track */}
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
              animate={ready ? "show" : "hidden"}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch"
            >
              {pageSlots.map((slot, i) =>
                slot === "more" ? (
                  <motion.div key="more" variants={itemV} className="h-full">
                    <Link
                      href="/directory?women_led=true"
                      className="group flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-pasha-line hover:border-pasha-red/30 bg-pasha-stone/40 hover:bg-pasha-red/[0.03] transition-all duration-300 px-5 py-10 h-full min-h-[260px]"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-pasha-red/10 border border-pasha-red/15 grid place-items-center">
                        <span className="font-serif text-2xl text-pasha-red leading-none">+{remaining}</span>
                      </div>
                      <div className="text-center">
                        <p className="font-serif text-lg text-pasha-ink group-hover:text-pasha-red transition-colors">
                          +{formatNumber(remaining)} More
                        </p>
                        <p className="text-sm text-pasha-muted mt-0.5">Women-Led Startups</p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-pasha-red/50 group-hover:text-pasha-red transition-colors">
                        Browse all <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </Link>
                  </motion.div>
                ) : (
                  <motion.div key={(slot as WomenLedStartup).id} variants={itemV}>
                    <FounderCard startup={slot as WomenLedStartup} />
                  </motion.div>
                )
              )}
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
