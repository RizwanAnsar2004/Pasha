"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import { initials, formatNumber } from "@/lib/utils";
import type { WomenLedStartup } from "@/lib/women-led";

const EASE = [0.22, 1, 0.36, 1] as const;

const ACCENTS = [
  { grad: "from-rose-500 to-pink-400",      light: "bg-rose-50",     text: "text-rose-600",    tag: "bg-rose-500/10 text-rose-600"    },
  { grad: "from-fuchsia-500 to-violet-400", light: "bg-fuchsia-50",  text: "text-fuchsia-600", tag: "bg-fuchsia-500/10 text-fuchsia-600" },
  { grad: "from-violet-500 to-purple-400",  light: "bg-violet-50",   text: "text-violet-600",  tag: "bg-violet-500/10 text-violet-600"  },
  { grad: "from-pink-500 to-rose-400",      light: "bg-pink-50",     text: "text-pink-600",    tag: "bg-pink-500/10 text-pink-600"    },
  { grad: "from-rose-400 to-fuchsia-500",   light: "bg-rose-50",     text: "text-rose-600",    tag: "bg-rose-500/10 text-rose-600"    },
];

export type WomenFounderStartup = WomenLedStartup;

function FounderCard({ startup, index }: { startup: WomenLedStartup; index: number }) {
  const accent = ACCENTS[index % ACCENTS.length];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: EASE }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="group relative flex rounded-2xl overflow-hidden border border-pasha-line/60 bg-white shadow-[0_2px_12px_rgba(14,14,16,0.06)] hover:shadow-[0_16px_48px_-12px_rgba(244,63,94,0.2)] hover:border-rose-200/60 transition-all duration-400"
    >
      <Link
        href={`/directory/${startup.slug}`}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40"
      />

      {/* Left: gradient color panel */}
      <div className={`relative w-20 shrink-0 bg-gradient-to-b ${accent.grad} flex flex-col items-center justify-center gap-1`}>
        {/* shimmer */}
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_40%_20%,rgba(255,255,255,0.3),transparent_60%)]" />
        <div className="relative w-10 h-10 rounded-xl bg-white/20 backdrop-blur border border-white/30 grid place-items-center text-white font-bold text-sm shadow group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-400">
          {initials(startup.startup_name)}
        </div>
        <span className="relative text-[9px] font-bold uppercase tracking-[1px] text-white/70 mt-1 text-center px-1 leading-tight">
          Women<br />Led
        </span>
      </div>

      {/* Right: content */}
      <div className="flex flex-col flex-1 px-4 py-4 min-w-0">
        <h3 className={`font-serif text-base text-pasha-ink leading-tight line-clamp-1 group-hover:${accent.text} transition-colors`}>
          {startup.startup_name}
        </h3>

        {startup.founder_name && (
          <p className="mt-0.5 text-[12px] text-pasha-muted truncate">
            {startup.founder_name}
          </p>
        )}

        <div className="mt-auto pt-3 flex flex-wrap gap-1.5">
          {startup.primary_industry && (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${accent.tag}`}>
              {startup.primary_industry}
            </span>
          )}
        </div>
      </div>

      {/* Arrow — far right */}
      <div className="flex items-center pr-4 shrink-0">
        <span className="w-7 h-7 rounded-full border border-pasha-line/60 grid place-items-center text-pasha-muted/40 group-hover:border-rose-300 group-hover:text-rose-500 group-hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <ArrowUpRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </motion.div>
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

  const shown = startups.slice(0, 5);
  const remaining = Math.max(totalCount - shown.length, 0);

  // Split into two columns
  const colA = shown.filter((_, i) => i % 2 === 0);
  const colB = shown.filter((_, i) => i % 2 === 1);
  const colBIndexes = shown.map((_, i) => i).filter(i => i % 2 === 1);

  return (
    <section className="relative bg-white border-b border-pasha-line py-20 sm:py-28 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full bg-rose-500/[0.06] blur-[130px] animate-float-slow" />
        <div className="absolute -bottom-28 right-1/4 w-[460px] h-[460px] rounded-full bg-fuchsia-500/[0.05] blur-[130px] animate-float-slower" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">

        {/* Header + CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
        >
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 ring-1 ring-inset ring-rose-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-rose-600">
              <Sparkles className="w-3 h-3" />
              Women-Led Startups
            </span>
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl lg:text-5xl tracking-tight text-pasha-ink text-balance">
              Celebrating Pakistan&apos;s{" "}
              <span className="bg-gradient-to-r from-rose-500 to-fuchsia-500 bg-clip-text text-transparent">
                Women Founders
              </span>
            </h2>
            <p className="mt-3 text-pasha-muted text-base leading-relaxed max-w-xl">
              {formatNumber(totalCount)} women-led startups registered on the P@SHA directory —
              spotlighted, supported, and connected with targeted opportunities.
            </p>
          </div>
          <Link
            href="/directory?women_led=true"
            className="group self-start sm:self-auto inline-flex items-center gap-2 rounded-full bg-pasha-red px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-pasha-red/20 hover:bg-pasha-red-dark hover:-translate-y-0.5 transition-all shrink-0"
          >
            Explore Women Founders
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {/* Two-column grid — auto-placed, always aligned */}
        <div className="grid sm:grid-cols-2 gap-3">
          {shown.map((startup, i) => (
            <FounderCard key={startup.id} startup={startup} index={i} />
          ))}

          {remaining > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: shown.length * 0.08, ease: EASE }}
              whileHover={{ y: -4 }}
            >
              <Link
                href="/directory?women_led=true"
                className="group flex items-center gap-4 rounded-2xl border-2 border-dashed border-rose-300/50 bg-rose-500/[0.03] hover:bg-rose-500/[0.07] hover:border-rose-400/60 transition-all duration-300 px-5 py-4 h-full min-h-[80px]"
              >
                <div className="w-20 shrink-0 flex justify-center">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 grid place-items-center">
                    <span className="font-serif text-lg text-rose-600 leading-none">+{remaining}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-base text-rose-600">+{formatNumber(remaining)} More</p>
                  <p className="text-[11px] text-pasha-muted">Women-Led Startups</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-rose-400 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </motion.div>
          )}
        </div>

      </div>
    </section>
  );
}
