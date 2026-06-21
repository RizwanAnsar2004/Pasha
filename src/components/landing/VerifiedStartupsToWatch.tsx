"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, BadgeCheck, Sparkles } from "lucide-react";
import { initials } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const ACCENTS = [
  { grad: "from-emerald-500 to-teal-400",   soft: "bg-emerald-50",  text: "text-emerald-600",  glow: "rgba(16,185,129,0.22)"  },
  { grad: "from-rose-500 to-pink-400",       soft: "bg-rose-50",     text: "text-rose-600",     glow: "rgba(244,63,94,0.22)"   },
  { grad: "from-sky-500 to-cyan-400",        soft: "bg-sky-50",      text: "text-sky-600",      glow: "rgba(14,165,233,0.22)"  },
  { grad: "from-violet-500 to-purple-400",   soft: "bg-violet-50",   text: "text-violet-600",   glow: "rgba(139,92,246,0.22)"  },
  { grad: "from-amber-500 to-orange-400",    soft: "bg-amber-50",    text: "text-amber-600",    glow: "rgba(245,158,11,0.22)"  },
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

function StartupCard({ startup, index }: { startup: WatchlistStartup; index: number }) {
  const accent = ACCENTS[index % ACCENTS.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: EASE }}
      whileHover={{ y: -6 }}
      style={{ "--glow": accent.glow } as React.CSSProperties}
      className="group relative flex flex-col rounded-2xl bg-white border border-pasha-line/70 overflow-hidden shadow-[0_1px_6px_rgba(14,14,16,0.06)] hover:shadow-[0_20px_50px_-16px_var(--glow)] hover:border-transparent transition-all duration-400"
    >
      <Link
        href="/directory"
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none"
      />

      {/* Bold colorful left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${accent.grad} group-hover:w-1.5 transition-all duration-300`} />

      {/* Rank number — subtle, top right */}
      <span className={`absolute top-3 right-4 font-serif text-3xl leading-none ${accent.text} opacity-10 group-hover:opacity-20 transition-opacity select-none tabular-nums`}>
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="relative z-0 flex flex-col flex-1 pl-6 pr-5 pt-5 pb-4">
        {/* Avatar row */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accent.grad} grid place-items-center text-white font-bold text-sm shadow-md group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-400`}>
            {initials(startup.startup_name)}
          </div>
          {startup.pasha_verified && (
            <BadgeCheck className={`w-4 h-4 ${accent.text} opacity-60 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5`} />
          )}
        </div>

        {/* Name */}
        <h3 className={`font-serif text-base text-pasha-ink leading-tight line-clamp-2 group-hover:${accent.text} transition-colors`}>
          {startup.startup_name}
        </h3>

        {/* Tagline */}
        {startup.tagline && (
          <p className="mt-1 text-[11px] text-pasha-muted line-clamp-2 leading-snug">
            {startup.tagline}
          </p>
        )}

        {/* Tags */}
        <div className="mt-auto pt-4 flex flex-wrap gap-1.5">
          {startup.primary_industry && (
            <span className={`inline-flex items-center rounded-full ${accent.soft} px-2.5 py-0.5 text-[10px] font-semibold ${accent.text}`}>
              {startup.primary_industry}
            </span>
          )}
          {startup.city && (
            <span className="inline-flex items-center rounded-full bg-pasha-ink/5 px-2.5 py-0.5 text-[10px] font-medium text-pasha-muted">
              {startup.city}
            </span>
          )}
        </div>
      </div>

      {/* Bottom strip */}
      <div className="relative z-0 pl-6 pr-5 py-3 border-t border-pasha-line/50 flex items-center justify-between">
        <span className="text-[11px] text-pasha-muted">View Profile</span>
        <span className={`w-7 h-7 rounded-full bg-gradient-to-br ${accent.grad} grid place-items-center text-white opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300`}>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </motion.div>
  );
}

export function VerifiedStartupsToWatch({ startups }: { startups: WatchlistStartup[] }) {
  if (startups.length === 0) return null;

  const shown = startups.slice(0, 5);

  return (
    <section className="relative bg-pasha-stone border-b border-pasha-line py-20 sm:py-28 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-dots opacity-50" />
        <div className="absolute -top-28 -right-24 w-[520px] h-[520px] rounded-full bg-pasha-red/[0.05] blur-[130px] animate-float-slow" />
        <div className="absolute -bottom-32 -left-20 w-[480px] h-[480px] rounded-full bg-emerald-500/[0.04] blur-[130px] animate-float-slower" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
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
            className="group self-start sm:self-auto inline-flex items-center gap-2 rounded-full border border-pasha-line bg-white/80 backdrop-blur px-5 py-2.5 text-sm font-medium text-pasha-ink shadow-sm hover:border-pasha-ink/30 hover:bg-pasha-ink hover:text-white hover:shadow-lg transition-all hover:-translate-y-0.5 shrink-0"
          >
            Browse All Startups
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {shown.map((startup, i) => (
            <StartupCard key={startup.id} startup={startup} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
