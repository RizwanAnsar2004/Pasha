"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowUpRight, Trophy, Award } from "lucide-react";
import { initials } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

type AwardTier = "winner" | "runner_up" | "peoples_choice" | "recognition";

function classifyAward(text: string): AwardTier {
  const l = text.toLowerCase();
  if (l.includes("runner up") || l.includes("runner-up") || l.includes("first runner")) return "runner_up";
  if (l.includes("people") || l.includes("choice")) return "peoples_choice";
  if (l.includes("winner") || l.includes("winning")) return "winner";
  return "recognition";
}

const AWARD_BADGE: Record<AwardTier, { label: string; cls: string; dot: string }> = {
  winner: {
    label: "Winner",
    cls: "bg-amber-400/15 border border-amber-400/25 text-amber-300",
    dot: "bg-amber-400",
  },
  runner_up: {
    label: "First Runner Up",
    cls: "bg-white/[0.09] border border-white/15 text-white/65",
    dot: "bg-white/50",
  },
  peoples_choice: {
    label: "People's Choice",
    cls: "bg-pasha-red/20 border border-pasha-red/30 text-pasha-red-light",
    dot: "bg-pasha-red",
  },
  recognition: {
    label: "Award",
    cls: "bg-white/[0.06] border border-white/10 text-white/45",
    dot: "bg-white/30",
  },
};

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

const DEMO_WINNERS: AwardWinningStartup[] = [
  {
    id: "demo-1",
    startup_name: "Rozgar.pk",
    primary_industry: "HRTech",
    city: "Lahore",
    awards: "Winner",
  },
  {
    id: "demo-2",
    startup_name: "Maktab",
    primary_industry: "EdTech",
    city: "Karachi",
    awards: "People's Choice Award Winner",
  },
  {
    id: "demo-3",
    startup_name: "CropSense",
    primary_industry: "AgriTech",
    city: "Islamabad",
    awards: "First Runner Up",
  },
];

const JUNK_PATTERNS = [
  /^https?:\/\//i,
  /^no formal/i,
  /^none$/i,
  /^n\/a$/i,
  /^-+$/,
];

function firstAwardLine(awards?: string | null): string {
  if (!awards) return "";
  const line = awards
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !JUNK_PATTERNS.some((p) => p.test(l)));
  return line ?? "";
}

export function AwardWinningStartups({ startups }: { startups: AwardWinningStartup[] }) {
  const realWinners = startups
    .map((s) => ({ ...s, awardTitle: firstAwardLine(s.awards) }))
    .filter((s) => s.awardTitle.length > 0);

  // Pad with demo entries so all three award tiers are always visible
  const demoEntries = DEMO_WINNERS
    .map((s) => ({ ...s, awardTitle: firstAwardLine(s.awards) }))
    .filter((d) => !realWinners.some((r) => r.id === d.id));

  const winners = [...realWinners, ...demoEntries].slice(0, 5);

  if (winners.length === 0) return null;

  return (
    <section className="relative bg-pasha-ink py-20 sm:py-28 overflow-hidden">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-dots opacity-[0.12]" />
        <div className="absolute -top-28 -left-24 w-[520px] h-[520px] rounded-full bg-pasha-red/[0.12] blur-[140px] animate-float-slow" />
        <div className="absolute -bottom-32 -right-20 w-[480px] h-[480px] rounded-full bg-pasha-red/[0.08] blur-[140px] animate-float-slower" />
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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] backdrop-blur px-3 py-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-white/70">
              <Award className="w-3 h-3" />
              Awards
            </span>
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white text-balance">
              Latest Award-Winning Startups
            </h2>
            <p className="mt-4 text-white/55 text-lg leading-relaxed text-pretty">
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
            const meta = [winner.primary_industry, winner.city].filter(Boolean).join(" · ");
            const tier = classifyAward(winner.awardTitle);
            const badge = AWARD_BADGE[tier];
            return (
              <motion.li key={winner.id} variants={rowV}>
                <Link
                  href="/directory"
                  className="group relative grid grid-cols-[auto_1fr_auto] items-center gap-4 sm:gap-6 py-6 sm:py-7 border-b border-white/10 transition-colors"
                >
                  {/* Hover wash */}
                  <span aria-hidden className="pointer-events-none absolute inset-0 bg-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-400 rounded-xl" />

                  {/* Avatar */}
                  <span className="relative">
                    <span aria-hidden className="absolute -inset-1.5 rounded-2xl bg-pasha-red/30 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-500" />
                    <span className="relative grid w-12 h-12 rounded-2xl bg-pasha-red place-items-center text-white font-bold text-sm shadow-lg group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
                      {initials(winner.startup_name)}
                    </span>
                  </span>

                  {/* Name + meta + award badge */}
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
                    <span className="mt-2 flex items-center gap-2 flex-wrap">
                      {/* Tier badge chip */}
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[1.5px] ${badge.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                      {/* Award name */}
                      <span className="flex items-center gap-1 text-sm text-white/45">
                        <Trophy className="w-3 h-3 shrink-0 text-amber-400/60" />
                        <span className="truncate">{winner.awardTitle}</span>
                      </span>
                    </span>
                  </span>

                  {/* Arrow */}
                  <span className="relative grid place-items-center w-10 h-10 rounded-full border border-white/15 text-white/50 group-hover:bg-white group-hover:text-pasha-ink group-hover:border-white transition-all">
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
