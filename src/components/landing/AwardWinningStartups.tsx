"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowUpRight, Trophy, Award } from "lucide-react";
import { initials } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const ACCENTS = [
  "from-amber-500 to-yellow-500",
  "from-teal-500 to-cyan-500",
  "from-rose-500 to-red-500",
  "from-violet-500 to-purple-500",
  "from-emerald-500 to-green-500",
  "from-blue-500 to-indigo-500",
];

const containerV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};

const rowV: Variants = {
  hidden: { opacity: 0, x: -24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE } },
};

export type AwardWinningStartup = {
  id: string;
  startup_name: string;
  primary_industry?: string | null;
  city?: string | null;
  awards?: string | null;
  pasha_verified?: boolean | null;
};

function firstAwardLine(awards?: string | null): string {
  if (!awards) return "";
  const line = awards
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return line ?? "";
}

export function AwardWinningStartups({ startups }: { startups: AwardWinningStartup[] }) {
  const winners = startups
    .map((s) => ({ ...s, awardTitle: firstAwardLine(s.awards) }))
    .filter((s) => s.awardTitle.length > 0)
    .slice(0, 5);

  if (winners.length === 0) return null;

  return (
    <section className="relative bg-pasha-ink py-20 sm:py-28 overflow-hidden">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-dots opacity-[0.12]" />
        <div className="absolute -top-28 -left-24 w-[520px] h-[520px] rounded-full bg-amber-500/[0.12] blur-[140px] animate-float-slow" />
        <div className="absolute -bottom-32 -right-20 w-[480px] h-[480px] rounded-full bg-pasha-red/[0.12] blur-[140px] animate-float-slower" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex items-end justify-between gap-6 mb-12 flex-wrap"
        >
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] backdrop-blur px-3 py-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-amber-300">
              <Award className="w-3 h-3" />
              Awards
            </span>
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white text-balance">
              Latest Award-Winning Startups
            </h2>
            <p className="mt-4 text-white/60 text-lg leading-relaxed text-pretty">
              Recognised by P@SHA and industry partners for outstanding
              products, growth, and impact.
            </p>
          </div>
          <Link
            href="/directory"
            className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] backdrop-blur px-5 py-2.5 text-sm font-medium text-white hover:bg-white hover:text-pasha-ink hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            Browse All Startups
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </motion.div>

        {/* Leaderboard */}
        <motion.ol
          variants={containerV}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="border-t border-white/10"
        >
          {winners.map((winner, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            const meta = [winner.primary_industry, winner.city].filter(Boolean).join(" · ");
            return (
              <motion.li key={winner.id} variants={rowV}>
                <Link
                  href="/directory"
                  className="group relative grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_auto_1fr_auto] items-center gap-4 sm:gap-6 py-6 sm:py-7 border-b border-white/10 transition-colors"
                >
                  {/* hover wash */}
                  <span aria-hidden className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${accent} opacity-0 group-hover:opacity-[0.07] transition-opacity duration-500 rounded-2xl`} />

                  {/* Rank */}
                  <span className="relative font-serif text-3xl sm:text-5xl leading-none text-white/25 group-hover:text-white tabular-nums transition-colors duration-300 w-10 sm:w-16">
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  {/* Avatar */}
                  <span className="relative hidden sm:block">
                    <span aria-hidden className={`absolute -inset-1.5 rounded-2xl bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-50 blur-md transition-opacity duration-500`} />
                    <span className={`relative grid w-12 h-12 rounded-2xl bg-gradient-to-br ${accent} place-items-center text-white font-bold text-sm shadow-lg group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500`}>
                      {initials(winner.startup_name)}
                    </span>
                  </span>

                  {/* Name + meta + award */}
                  <span className="relative min-w-0">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif text-xl sm:text-2xl text-white leading-tight group-hover:text-amber-200 transition-colors">
                        {winner.startup_name}
                      </span>
                      {meta && (
                        <span className="text-[10px] font-mono uppercase tracking-[1.5px] text-white/40">
                          {meta}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-sm text-amber-300/90">
                      <Trophy className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{winner.awardTitle}</span>
                    </span>
                  </span>

                  {/* Arrow */}
                  <span className="relative grid place-items-center w-10 h-10 rounded-full border border-white/15 text-white/70 group-hover:bg-white group-hover:text-pasha-ink group-hover:border-white transition-all">
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </span>
                </Link>
              </motion.li>
            );
          })}
        </motion.ol>
      </div>
    </section>
  );
}
