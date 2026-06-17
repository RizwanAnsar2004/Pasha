"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Trophy } from "lucide-react";
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
    .slice(0, 4);

  if (winners.length === 0) return null;

  return (
    <section className="relative bg-pasha-stone border-b border-pasha-line py-20 sm:py-28 overflow-hidden">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex items-end justify-between gap-6 mb-14 flex-wrap"
        >
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full bg-pasha-red/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-pasha-red">
              Awards
            </span>
            <h2 className="mt-4 font-serif text-3xl leading-[52px] sm:text-4xl lg:text-5xl tracking-tight text-pasha-ink text-balance">
              Latest Award-Winning Startups
            </h2>
            <p className="mt-4 text-pasha-muted text-lg leading-relaxed text-pretty">
              Recognised by P@SHA and industry partners for outstanding
              products, growth, and impact.
            </p>
          </div>
          <Link
            href="/directory"
            className="group inline-flex items-center gap-2 rounded-full border border-pasha-line bg-white px-5 py-2.5 text-sm font-medium text-pasha-ink hover:border-pasha-ink/30 hover:bg-pasha-ink hover:text-white transition-all"
          >
            Browse All Startups
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {winners.map((winner, i) => (
            <motion.div
              key={winner.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
              className="group relative flex flex-col h-full rounded-2xl bg-white border border-pasha-line hover:border-pasha-ink/30 hover:shadow-[0_20px_50px_-20px_rgba(14,14,16,0.18)] transition-all duration-300 overflow-hidden"
            >
              <Link
                href="/directory"
                className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pasha-red/30"
              />
              <div className={`h-1 bg-gradient-to-r ${ACCENTS[i % ACCENTS.length]}`} />

              <div className="relative z-0 p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${ACCENTS[i % ACCENTS.length]} grid place-items-center text-white font-bold text-sm shadow-sm`}
                  >
                    {initials(winner.startup_name)}
                  </div>
                  <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                </div>

                {(winner.primary_industry || winner.city) && (
                  <div className="mt-4 text-[10px] font-mono uppercase tracking-[1.5px] text-pasha-muted">
                    {[winner.primary_industry, winner.city].filter(Boolean).join(" · ")}
                  </div>
                )}

                <h3 className="mt-1.5 font-serif text-lg text-pasha-ink group-hover:text-pasha-red transition-colors leading-tight">
                  {winner.startup_name}
                </h3>

                <p className="mt-auto pt-3 text-sm text-pasha-red font-medium leading-relaxed line-clamp-2">
                  {winner.awardTitle}
                </p>
              </div>

              <ArrowUpRight
                aria-hidden
                className="absolute top-4 right-4 w-4 h-4 text-pasha-muted opacity-0 group-hover:opacity-100 transition-opacity z-20"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
