"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";
import { initials, formatNumber } from "@/lib/utils";
import type { WomenLedStartup } from "@/lib/women-led";

const EASE = [0.22, 1, 0.36, 1] as const;

const ACCENTS = [
  "from-emerald-500 to-teal-500",
  "from-teal-500 to-cyan-500",
  "from-rose-500 to-orange-400",
  "from-violet-500 to-purple-500",
  "from-amber-500 to-orange-500",
];

export type WomenFounderStartup = WomenLedStartup;

export function WomenFounders() {
  const [startups, setStartups] = useState<WomenFounderStartup[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/women-led-startups?limit=5")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { startups: WomenFounderStartup[]; totalCount: number }) => {
        if (cancelled) return;
        setStartups(data.startups ?? []);
        setTotalCount(data.totalCount ?? 0);
      })
      .catch(() => {
        if (!cancelled) {
          setStartups([]);
          setTotalCount(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || startups.length === 0) return null;

  const shown = startups.slice(0, 5);
  const remaining = Math.max(totalCount - shown.length, 0);

  return (
    <section className="relative bg-white border-b border-pasha-line py-20 sm:py-28 overflow-hidden">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-12 lg:gap-16 items-center">
          {/* Left: copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-rose-600">
              <MapPin className="w-3 h-3" />
              Women-Led Startups
            </span>
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl tracking-tight text-pasha-ink text-balance">
              Celebrating Pakistan&apos;s Women Founders
            </h2>
            <p className="mt-4 text-pasha-muted leading-relaxed text-pretty">
              {formatNumber(totalCount)} women-led startups are currently
              registered on the P@SHA directory. We actively support,
              spotlight, and connect women founders with targeted
              opportunities.
            </p>
            <Link
              href="/directory?women_led=true"
              className="group mt-7 inline-flex items-center gap-2 rounded-full bg-pasha-red px-6 py-3 text-sm font-medium text-white shadow-lg shadow-pasha-red/20 hover:bg-pasha-red-dark transition-all hover:-translate-y-0.5"
            >
              Explore Women Founders
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>

          {/* Right: card grid */}
          <div className="grid sm:grid-cols-3 gap-4 items-stretch">
            {shown.map((startup, i) => (
              <motion.div
                key={startup.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.07, ease: EASE }}
                whileHover={{ y: -4 }}
                className="group relative flex flex-col h-full rounded-2xl bg-white border border-pasha-line hover:border-pasha-ink/30 hover:shadow-[0_20px_50px_-20px_rgba(14,14,16,0.16)] transition-shadow duration-300 p-4"
              >
                <Link
                  href={`/directory/${startup.slug}`}
                  className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pasha-red/30"
                />
                <div className="flex items-center gap-2.5">
                  <div
                    className={`shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br ${ACCENTS[i % ACCENTS.length]} grid place-items-center text-white font-bold text-xs shadow-sm group-hover:scale-105 transition-transform duration-300`}
                  >
                    {initials(startup.startup_name)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-pasha-ink leading-tight truncate group-hover:text-pasha-red transition-colors">
                      {startup.startup_name}
                    </h3>
                    {startup.founder_name && (
                      <p className="text-xs text-pasha-muted truncate">
                        {startup.founder_name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="relative z-20 mt-auto pt-3 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-600">
                    Women-Led
                  </span>
                  {startup.primary_industry && (
                    <span className="inline-flex items-center rounded-full bg-pasha-ink/5 px-2 py-0.5 text-[10px] font-medium text-pasha-muted">
                      {startup.primary_industry}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}

            {remaining > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: shown.length * 0.07, ease: EASE }}
              >
                <Link
                  href="/directory?women_led=true"
                  className="group flex flex-col h-full items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-pasha-red/30 bg-pasha-red/[0.03] hover:bg-pasha-red/[0.06] hover:border-pasha-red/50 transition-colors p-4 text-center"
                >
                  <span className="font-serif text-lg text-pasha-red">
                    +{formatNumber(remaining)} More
                  </span>
                  <span className="text-xs text-pasha-muted">
                    Women-Led Startups
                  </span>
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
