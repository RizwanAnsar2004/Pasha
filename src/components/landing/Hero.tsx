"use client";

import Link from "next/link";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useInView,
  animate,
} from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  TrendingUp,
  Users,
  Sparkles,
  ChevronDown,
  Star,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { initials, formatNumber } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const DECK_ACCENTS = [
  "from-orange-400 to-amber-500",
  "from-amber-400 to-yellow-500",
  "from-emerald-400 to-teal-500",
  "from-blue-400 to-cyan-500",
  "from-green-400 to-emerald-500",
];
const DECK_ROTATES = [-8, -4, 0, 4, 8];
const DECK_Y = [30, 10, 0, 10, 30];

export type HeroDeckStartup = {
  id: string;
  startup_name: string;
  primary_industry?: string | null;
  city?: string | null;
  current_revenue?: number | null;
  number_of_customers?: number | null;
  total_employees?: number | null;
  pasha_verified?: boolean | null;
};

export function Hero({ databankCount, deck }: { databankCount: number; deck: HeroDeckStartup[] }) {
  // Mouse parallax for the background gradient blobs
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 18 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 18 });
  const blob1X = useTransform(springX, [-1, 1], [-30, 30]);
  const blob1Y = useTransform(springY, [-1, 1], [-30, 30]);
  const blob2X = useTransform(springX, [-1, 1], [25, -25]);
  const blob2Y = useTransform(springY, [-1, 1], [25, -25]);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    mouseX.set(((e.clientX - left) / width) * 2 - 1);
    mouseY.set(((e.clientY - top) / height) * 2 - 1);
  }

  return (
    <section
      onMouseMove={onMouseMove}
      className="relative overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #FAF8F4 0%, #FFFFFF 60%, #FAF8F4 100%)",
      }}
    >
      {/* ─── Warm gradient mesh blobs ─────────────────────────── */}
      <motion.div
        style={{ x: blob1X, y: blob1Y }}
        aria-hidden
        className="absolute -top-40 -left-32 w-[600px] h-[600px] rounded-full blur-[120px] animate-float-slow bg-gradient-to-br from-orange-200/60 via-rose-200/50 to-amber-100/40"
      />
      <motion.div
        style={{ x: blob2X, y: blob2Y }}
        aria-hidden
        className="absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full blur-[140px] animate-float-slower bg-gradient-to-br from-rose-200/60 via-pink-200/40 to-orange-200/50"
      />

      {/* Center glow */}
      <div
        aria-hidden
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-gradient-to-r from-pasha-red/[0.08] via-pasha-red-light/[0.05] to-pasha-red/[0.08] blur-3xl"
      />

      {/* Subtle dot grid texture */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(14, 14, 16, 0.06) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 pt-6 sm:pt-8 lg:pt-10 pb-12 lg:pb-16">
        {/* ───────────────────────────────────────────────────────
            MAGAZINE MASTHEAD — top-line metadata
            ─────────────────────────────────────────────────────── */}

        {/* ───────────────────────────────────────────────────────
            CENTERED EDITORIAL HEADLINE
            ─────────────────────────────────────────────────────── */}
        <div className="text-center max-w-5xl mx-auto mt-8 lg:mt-12">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm border border-pasha-line shadow-sm px-3 py-1.5 mb-5"
          >
            <Star className="w-3 h-3 text-pasha-red fill-pasha-red" />
            <span className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-ink/80">
              The vetted home of Pakistani product startups
            </span>
          </motion.div>

          {/* HUGE headline */}
          <h1 className="font-serif text-[40px] sm:text-[56px] lg:text-[76px] leading-[0.95] tracking-tight text-pasha-ink text-balance">
            <motion.span
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
              className="block"
            >
              Every product
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
              className="block"
            >
              startup{" "}
              <span className="italic font-light text-pasha-muted">that&apos;s</span>{" "}
              building
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.5, ease: EASE }}
              className="block relative"
            >
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-pasha-red via-pasha-red-light to-orange-500 bg-clip-text text-transparent animate-gradient-shift">
                  Pakistan&apos;s tomorrow
                </span>
                {/* Hand-drawn underline */}
                <motion.svg
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.2, delay: 1, ease: EASE }}
                  className="absolute -bottom-1 sm:-bottom-2 left-0 w-full h-3"
                  viewBox="0 0 300 12"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <motion.path
                    d="M2 8 Q 60 2, 120 6 T 240 5 T 298 7"
                    stroke="url(#heroUnderline)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <defs>
                    <linearGradient id="heroUnderline" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#E6160F" />
                      <stop offset="100%" stopColor="#FF8A30" />
                    </linearGradient>
                  </defs>
                </motion.svg>
              </span>
              .
            </motion.span>
          </h1>

          {/* Subhead */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-6 text-base sm:text-lg text-pasha-muted max-w-2xl mx-auto leading-relaxed text-pretty"
          >
            A curated index of {databankCount.toLocaleString()}+ Pakistani product
            companies — vetted by P@SHA, surfaced to investors, and built for the
            founders shipping what&apos;s next.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.85 }}
            className="mt-7 flex flex-col sm:flex-row justify-center gap-3"
          >
            <Link
              href="/apply"
              className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-pasha-ink px-7 py-3.5 text-base font-medium text-white shadow-xl shadow-pasha-ink/20 hover:bg-pasha-red hover:shadow-pasha-red/30 transition-all hover:-translate-y-0.5 overflow-hidden"
            >
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-700"
              />
              <span className="relative">Apply to be indexed</span>
              <ArrowRight className="relative w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/directory"
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-pasha-ink/15 bg-white/60 backdrop-blur-sm px-7 py-3.5 text-base font-medium text-pasha-ink hover:bg-white hover:border-pasha-ink/30 transition-all"
            >
              Explore the index
              <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </motion.div>

          {/* Inline trust metrics */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm"
          >
            <InlineMetric number={databankCount} label="indexed" />
            <Dot />
            <InlineMetric number={500} suffix="+" label="founders" />
            <Dot />
            <InlineMetric number={6} label="committees" />
            <Dot />
            <span className="inline-flex items-center gap-1.5 text-pasha-muted">
              <Sparkles className="w-3.5 h-3.5 text-pasha-red" />
              <span className="font-mono text-[11px] uppercase tracking-[1.5px]">
                No fee · No equity
              </span>
            </span>
          </motion.div>
        </div>

        {/* ───────────────────────────────────────────────────────
            FANNED CARD DECK — below the hero, slightly overlapping
            ─────────────────────────────────────────────────────── */}
        <div className="relative mt-12 lg:mt-16 h-[240px] sm:h-[260px] flex items-end justify-center">
          {/* "Featured today" label above the deck */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.4 }}
            className="absolute -top-2 left-1/2 -translate-x-1/2 z-30 inline-flex items-center gap-2 rounded-full bg-white border border-pasha-line shadow-sm px-3 py-1.5"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-pasha-red opacity-75 animate-pulse-soft" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-pasha-red" />
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[2px] text-pasha-ink/70">
              Featured · this week
            </span>
          </motion.div>

          {/* The deck */}
          <div className="relative w-full max-w-4xl h-full">
            {deck.slice(0, 5).map((startup, i) => (
              <FannedCard key={startup.id} startup={startup} index={i} total={Math.min(deck.length, 5)} accent={DECK_ACCENTS[i] ?? DECK_ACCENTS[0]} rotate={DECK_ROTATES[i] ?? 0} y={DECK_Y[i] ?? 0} />
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.8 }}
          className="hidden md:flex justify-center mt-8 flex-col items-center gap-1.5 text-pasha-muted"
        >
          <span className="font-mono text-[9px] uppercase tracking-[2.5px]">
            Continue
          </span>
          <ChevronDown className="w-4 h-4 animate-scroll-bounce" />
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   FannedCard — startup card in a fanned arrangement.
   Slides up + rotates into place. Lifts straight up on hover.
   ───────────────────────────────────────────────────────────── */
function FannedCard({
  startup,
  accent,
  rotate,
  y,
  index,
  total,
}: {
  startup: HeroDeckStartup;
  accent: string;
  rotate: number;
  y: number;
  index: number;
  total: number;
}) {
  const positions = [
    "left-[2%] sm:left-[6%]",
    "left-[20%] sm:left-[22%]",
    "left-1/2 -translate-x-1/2",
    "right-[20%] sm:right-[22%]",
    "right-[2%] sm:right-[6%]",
  ];
  const positionClass = positions[index] ?? "left-1/2 -translate-x-1/2";
  const isCenter = index === Math.floor(total / 2);

  // Pick the most impressive metric available
  let metric = "";
  let metricLabel = "";
  if (startup.number_of_customers) {
    metric = formatNumber(startup.number_of_customers) ?? "";
    metricLabel = "customers";
  } else if (startup.current_revenue) {
    metric = formatNumber(startup.current_revenue) ?? "";
    metricLabel = "revenue";
  } else if (startup.total_employees) {
    metric = formatNumber(startup.total_employees) ?? "";
    metricLabel = "employees";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 80, rotate: 0 }}
      animate={{ opacity: 1, y, rotate }}
      transition={{ duration: 0.8, delay: 1.0 + index * 0.08, ease: EASE }}
      whileHover={{ y: -10, rotate: 0, scale: 1.05, zIndex: 50 }}
      style={{ zIndex: isCenter ? 20 : 10 - Math.abs(index - 2) }}
      className={`absolute bottom-0 ${positionClass} w-56 sm:w-64 transition-shadow duration-300`}
    >
      <div className="rounded-2xl bg-white border border-pasha-line shadow-[0_20px_50px_-15px_rgba(14,14,16,0.20)] hover:shadow-[0_30px_70px_-15px_rgba(14,14,16,0.30)] overflow-hidden">
        <div className={`h-1.5 bg-gradient-to-r ${accent}`} />
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div
              className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${accent} grid place-items-center text-white font-bold text-sm shadow-sm`}
            >
              {initials(startup.startup_name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <div className="font-semibold text-[14px] text-pasha-ink truncate">
                  {startup.startup_name}
                </div>
                {startup.pasha_verified && (
                  <BadgeCheck className="w-3.5 h-3.5 text-pasha-red shrink-0" />
                )}
              </div>
              {startup.primary_industry && (
                <div className="text-[10px] font-mono uppercase tracking-[1.5px] text-pasha-muted mt-0.5">
                  {startup.primary_industry}
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-pasha-line/70 flex items-center justify-between">
            {startup.city && (
              <span className="inline-flex items-center gap-1 text-[11px] text-pasha-muted">
                <Users className="w-3 h-3" />
                {startup.city}
              </span>
            )}
            {metric && (
              <span className="inline-flex items-baseline gap-1">
                <TrendingUp className="w-3 h-3 text-pasha-muted" />
                <span className="font-serif text-[13px] font-semibold text-pasha-ink leading-none">
                  {metric}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-[1px] text-pasha-muted">
                  {metricLabel}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function InlineMetric({
  number,
  label,
  suffix = "",
}: {
  number: number;
  label: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, number, {
      duration: 1.6,
      ease: EASE,
      onUpdate: (v) => setDisplay(Math.round(v).toLocaleString()),
    });
    return () => controls.stop();
  }, [inView, number]);

  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span
        ref={ref}
        className="font-serif text-xl font-semibold text-pasha-ink tabular-nums"
      >
        {display}
        {suffix}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-pasha-muted">
        {label}
      </span>
    </span>
  );
}

function Dot() {
  return (
    <span aria-hidden className="w-1 h-1 rounded-full bg-pasha-ink/20" />
  );
}
