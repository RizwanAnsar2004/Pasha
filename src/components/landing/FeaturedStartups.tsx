"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, BadgeCheck, TrendingUp, Users, Globe } from "lucide-react";
import { initials, formatNumber, formatCurrency } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const ACCENTS = [
  "from-orange-500 to-amber-500",
  "from-amber-500 to-yellow-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-green-500 to-emerald-500",
  "from-violet-500 to-purple-500",
  "from-rose-500 to-pink-500",
  "from-sky-500 to-blue-500",
];

export type FeaturedStartup = {
  id: string;
  startup_name: string;
  tagline?: string | null;
  primary_industry?: string | null;
  city?: string | null;
  logo_url?: string | null;
  current_revenue?: number | null;
  total_employees?: number | null;
  number_of_customers?: number | null;
  pasha_verified?: boolean | null;
};

export function FeaturedStartups({ startups }: { startups: FeaturedStartup[] }) {
  const cards = startups.slice(0, 5);

  return (
    <section className="relative bg-white border-b border-pasha-line py-20 sm:py-28 overflow-hidden">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex items-end justify-between gap-6 mb-14 flex-wrap"
        >
          <div className="max-w-2xl">
            <span className="font-mono text-[11px] uppercase tracking-[3px] text-pasha-red">
              Featured startups
            </span>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl tracking-tight text-pasha-ink text-balance">
              Real founders. Real traction. Real impact.
            </h2>
            <p className="mt-4 text-pasha-muted text-lg leading-relaxed text-pretty">
              A glimpse of the product companies already verified in the directory.
            </p>
          </div>
          <Link
            href="/directory"
            className="group inline-flex items-center gap-2 text-sm font-medium text-pasha-ink hover:text-pasha-red transition-colors"
          >
            View all startups
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </motion.div>

        {/* Bento grid */}
        {cards.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <BentoCard startup={cards[0]} accent={ACCENTS[0]} index={0} large />
            {cards[1] && <BentoCard startup={cards[1]} accent={ACCENTS[1]} index={1} />}
            {cards[2] && <BentoCard startup={cards[2]} accent={ACCENTS[2]} index={2} />}
            {cards[3] && <BentoCard startup={cards[3]} accent={ACCENTS[3]} index={3} />}
            {cards[4] && <BentoCard startup={cards[4]} accent={ACCENTS[4]} index={4} />}
          </div>
        )}
      </div>
    </section>
  );
}

function BentoCard({
  startup,
  accent,
  index,
  large = false,
}: {
  startup: FeaturedStartup;
  accent: string;
  index: number;
  large?: boolean;
}) {
  const abbr = initials(startup.startup_name);
  const employeeLabel = startup.total_employees ? formatNumber(startup.total_employees) : null;
  const customersLabel = startup.number_of_customers
    ? formatNumber(startup.number_of_customers)
    : null;
  const revenueLabel = startup.current_revenue
    ? formatCurrency(startup.current_revenue, "PKR")
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: EASE }}
      whileHover={{ y: -4 }}
      className={`group relative rounded-2xl bg-white border border-pasha-line hover:border-pasha-ink/30 hover:shadow-[0_20px_50px_-20px_rgba(14,14,16,0.18)] transition-all duration-300 overflow-hidden flex flex-col ${large ? "lg:col-span-2 lg:row-span-2" : ""}`}
    >
      <Link
        href="/directory"
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pasha-red/30"
      />

      {/* Top gradient accent */}
      <div className={`h-1 bg-gradient-to-r ${accent}`} />

      <div className={`relative z-0 p-5 flex flex-col flex-1 ${large ? "lg:p-7" : ""}`}>
        {/* Logo + verified row */}
        <div className="flex items-start justify-between gap-3">
          <div
            className={`shrink-0 rounded-2xl bg-gradient-to-br ${accent} grid place-items-center text-white font-bold shadow-sm ${
              large ? "w-16 h-16 text-xl" : "w-12 h-12 text-sm"
            }`}
          >
            {abbr}
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

        {/* Name */}
        <h3
          className={`mt-4 font-serif text-pasha-ink group-hover:text-pasha-red transition-colors leading-tight tracking-tight ${
            large ? "text-2xl lg:text-3xl" : "text-lg"
          }`}
        >
          {startup.startup_name}
        </h3>

        {/* Sector / city */}
        {(startup.primary_industry || startup.city) && (
          <div className="mt-1.5 text-[10px] font-mono uppercase tracking-[1.5px] text-pasha-muted">
            {[startup.primary_industry, startup.city].filter(Boolean).join(" · ")}
          </div>
        )}

        {/* Tagline */}
        {startup.tagline && (
          <p
            className={`mt-3 text-pasha-muted leading-relaxed text-pretty ${
              large ? "text-base lg:text-lg max-w-md" : "text-sm line-clamp-2"
            }`}
          >
            {startup.tagline}
          </p>
        )}

        {/* Stats footer */}
        <div className="mt-auto pt-4 flex items-center gap-4 text-[11px] text-pasha-muted">
          {employeeLabel && (
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span className="font-medium text-pasha-ink/70">{employeeLabel}</span>
            </span>
          )}
          {revenueLabel && (
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span className="font-medium text-pasha-ink/70">{revenueLabel}</span>
            </span>
          )}
          {customersLabel && (
            <span className="inline-flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <span className="font-medium text-pasha-ink/70">{customersLabel}</span>
            </span>
          )}
        </div>
      </div>

      {/* Hover arrow */}
      <ArrowUpRight
        aria-hidden
        className="absolute top-4 right-4 w-4 h-4 text-pasha-muted opacity-0 group-hover:opacity-100 transition-opacity z-20"
      />
    </motion.div>
  );
}
