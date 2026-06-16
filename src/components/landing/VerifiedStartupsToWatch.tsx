"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, BadgeCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { initials } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const ACCENTS = [
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-red-500",
  "from-teal-500 to-cyan-500",
  "from-violet-500 to-purple-500",
  "from-amber-500 to-orange-500",
  "from-blue-500 to-indigo-500",
];

export type WatchlistStartup = {
  id: string;
  startup_name: string;
  tagline?: string | null;
  primary_industry?: string | null;
  city?: string | null;
  product_stage?: string | null;
  pasha_verified?: boolean | null;
};

export function VerifiedStartupsToWatch({ startups }: { startups: WatchlistStartup[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ down: false, startX: 0, startScroll: 0, moved: false });
  const [isDragging, setIsDragging] = useState(false);

  function scrollByCard(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const amount = (card?.offsetWidth ?? 320) + 20;
    el.scrollBy({ left: amount * direction, behavior: "smooth" });
  }

  function onWheel(e: React.WheelEvent<HTMLDivElement>) {
    const el = trackRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = trackRef.current;
    if (!el) return;
    dragState.current = { down: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
    setIsDragging(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = trackRef.current;
    if (!el || !dragState.current.down) return;
    const dx = e.clientX - dragState.current.startX;
    if (Math.abs(dx) > 3) dragState.current.moved = true;
    el.scrollLeft = dragState.current.startScroll - dx;
  }

  function endDrag() {
    dragState.current.down = false;
    setIsDragging(false);
  }

  if (startups.length === 0) return null;

  return (
    <section className="relative bg-pasha-stone border-b border-pasha-line py-20 sm:py-28 overflow-hidden">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex items-end justify-between gap-6 mb-12 flex-wrap"
        >
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full bg-pasha-red/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-pasha-red">
              Featured Startups
            </span>
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl lg:text-5xl tracking-tight text-pasha-ink text-balance">
              Verified Startups to Watch
            </h2>
            <p className="mt-4 text-pasha-muted text-lg leading-relaxed text-pretty">
              Handpicked by the P@SHA committee — these startups are actively
              seeking investors, pilots, and partnerships.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/directory"
              className="group inline-flex items-center gap-2 rounded-full border border-pasha-line bg-white px-5 py-2.5 text-sm font-medium text-pasha-ink hover:border-pasha-ink/30 hover:bg-pasha-ink hover:text-white transition-all"
            >
              Browse All Startups
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollByCard(-1)}
                aria-label="Scroll left"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-pasha-line bg-white text-pasha-ink hover:border-pasha-ink/30 hover:bg-pasha-ink hover:text-white hover:scale-105 active:scale-95 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollByCard(1)}
                aria-label="Scroll right"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-pasha-line bg-white text-pasha-ink hover:border-pasha-ink/30 hover:bg-pasha-ink hover:text-white hover:scale-105 active:scale-95 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Carousel, contained within the section's max-width */}
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div
          ref={trackRef}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          className={`flex items-stretch gap-5 overflow-x-auto overflow-y-hidden py-3 px-1 -mx-1 snap-x snap-mandatory scroll-smooth select-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            isDragging ? "cursor-grabbing snap-none scroll-auto" : "cursor-grab"
          }`}
        >
          {startups.map((startup, i) => (
            <WatchCard
              key={startup.id}
              startup={startup}
              accent={ACCENTS[i % ACCENTS.length]}
              index={i}
            />
          ))}
          <div aria-hidden className="shrink-0 w-px" />
        </div>

        {/* Edge fade overlays to signal scrollability */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-3 left-0 w-10 sm:w-16 bg-gradient-to-r from-pasha-stone to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-3 right-0 w-10 sm:w-16 bg-gradient-to-l from-pasha-stone to-transparent"
        />
      </div>
    </section>
  );
}

function WatchCard({
  startup,
  accent,
  index,
}: {
  startup: WatchlistStartup;
  accent: string;
  index: number;
}) {
  const tags = [startup.primary_industry, startup.city, startup.product_stage].filter(
    Boolean
  ) as string[];

  return (
    <motion.div
      data-card
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: EASE }}
      whileHover={{ y: -6 }}
      className="group relative flex flex-col shrink-0 w-[280px] sm:w-[300px] snap-start rounded-2xl bg-white border border-pasha-line hover:border-pasha-ink/30 hover:shadow-[0_24px_60px_-20px_rgba(14,14,16,0.22)] transition-shadow duration-300 overflow-hidden"
    >
      <Link
        href="/directory"
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pasha-red/30"
      />

      <div className={`h-1 bg-gradient-to-r ${accent} group-hover:h-1.5 transition-all duration-300`} />

      <div className="relative z-0 p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3">
          <div
            className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${accent} grid place-items-center text-white font-bold text-sm shadow-sm group-hover:scale-105 transition-transform duration-300`}
          >
            {initials(startup.startup_name)}
          </div>
          {startup.pasha_verified && (
            <div className="inline-flex items-center gap-1 rounded-full bg-pasha-red/[0.07] px-2 py-0.5">
              <BadgeCheck className="w-3 h-3 text-pasha-red" />
              <span className="text-[9px] font-mono uppercase tracking-[1.5px] text-pasha-red font-semibold">
                Verified
              </span>
            </div>
          )}
        </div>

        <h3 className="mt-4 font-serif text-lg text-pasha-ink group-hover:text-pasha-red transition-colors leading-tight">
          {startup.startup_name}
        </h3>

        {startup.tagline && (
          <p className="mt-1.5 text-sm text-pasha-muted leading-relaxed line-clamp-2">
            {startup.tagline}
          </p>
        )}

        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {tags.map((tag, i) => (
              <span
                key={tag}
                className={
                  i === 0
                    ? "inline-flex items-center rounded-full bg-pasha-red/10 px-2.5 py-1 text-[11px] font-medium text-pasha-red"
                    : "inline-flex items-center rounded-full bg-pasha-ink/5 px-2.5 py-1 text-[11px] font-medium text-pasha-muted"
                }
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <Link
          href="/directory"
          className="relative z-20 mt-auto pt-4 inline-flex items-center gap-1 text-sm font-medium text-pasha-red group-hover:gap-2 transition-all"
        >
          View Profile
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    </motion.div>
  );
}
