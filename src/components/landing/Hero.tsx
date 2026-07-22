"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Search } from "lucide-react";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { usePageReady } from "@/components/PageReady";
import { useHomeSearch } from "./HomeSearchProvider";

const EASE = [0.22, 1, 0.36, 1] as const;

export type HeroOption = { value: string; label: string };

const QUICK_FILTERS = [
  { label: "AI & data", sector: "Artificial Intelligence (AI)" },
  { label: "Fintech", sector: "Fintech" },
  { label: "Healthtech", sector: "HealthTech" },
];

function StatTile({
  value,
  label,
  href,
  accent = false,
}: {
  value: string;
  label: string;
  href: string;
  accent?: boolean;
}) {
  return (
    <a
      href={href}
      className={`group relative flex flex-col gap-1.5 px-6 py-6 text-left transition-colors ${
        accent ? "bg-gradient-to-br from-pasha-red/25 via-pasha-red/[0.14] to-transparent" : "hover:bg-white/[0.03]"
      }`}
    >
      <span className={`font-serif text-2xl sm:text-xl font-extrabold leading-none ${accent ? "text-pasha-red-light" : "text-white"}`}>
        {value}
      </span>
      <span className="flex items-center gap-1 text-[12px] text-white/45 group-hover:text-white/70 transition-colors">
        {label}
        <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
      </span>
    </a>
  );
}

export function Hero({
  databankCount,
  sectors,
  stages,
}: {
  databankCount: number;
  // Resolved from the option_lists registry by the server — never imported
  sectors: HeroOption[];
  stages: HeroOption[];
}) {
  const ready = usePageReady();
  const reduceMotion = useReducedMotion();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { keyword, sector, stage, setKeyword, setSector, setStage, submit, quickFilter, reset } = useHomeSearch();

  const sectorOptions = [{ value: "all", label: "All sectors" }, ...sectors];
  // Stage labels are "Early Stage — generating revenue…"; the compact hero
  const stageOptions = [
    { value: "all", label: "All stages" },
    ...stages.map((s) => ({ value: s.value, label: s.label.split(" — ")[0] })),
  ];

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit();
  }

  return (
    <section className="relative overflow-hidden bg-pasha-ink">
      {/* Grid texture */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Color glows */}
      <div aria-hidden className="absolute -top-40 -left-32 w-[600px] h-[600px] rounded-full bg-pasha-red/[0.18] blur-[140px] animate-float-slow" />
      <div aria-hidden className="absolute -bottom-32 -right-32 w-[560px] h-[560px] rounded-full bg-accent-teal/[0.14] blur-[140px] animate-float-slower" />

      {/* Giant faint "@" watermark */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-[6vw] top-1/2 -translate-y-1/2 select-none font-serif font-black text-white/[0.035] leading-none"
        style={{ fontSize: "clamp(22rem, 38vw, 43rem)" }}
      >
        @
      </span>

      <div className="relative site-container pt-16 sm:pt18 lg:pt-18 pb-14 lg:pb-20">
        <div className="text-center mx-auto">
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
            animate={ready ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] backdrop-blur px-4 py-1.5 mb-6"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-pasha-red text-[10px] font-bold text-white">@</span>
            <span className="font-mono text-[10px] uppercase tracking-[2.5px] text-white/70">
            P@SHA Startup Hub
            </span>
          </motion.div>

          <h1 className="font-serif font-extrabold text-white leading-[0.96] tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 5rem)" }}>
            <motion.span
              initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
              animate={ready ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.65, delay: 0.2, ease: EASE }}
              className="block"
            >
              Connecting Pakistan&apos;s
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
              animate={ready ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.65, delay: 0.35, ease: EASE }}
              className="block text-pasha-red-light"
            >
              Startup Ecosystem
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            animate={ready ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-6 text-md sm:text-xs text-white/55 max-w-3xl mx-auto leading-relaxed text-pretty"
          >
            Explore credible startups across sectors, stages and cities. Find founders and teams
            ready for customers, investment, partnerships and talent.
          </motion.p>

          {/* Directory browser */}
          <motion.form
            initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
            animate={ready ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.65 }}
            onSubmit={onSubmit}
            className="mt-10 mx-auto max-w-5xl rounded-[32px] bg-white p-3 shadow-2xl shadow-black/40 flex flex-col sm:flex-row items-stretch gap-2"
          >
            <div className="flex flex-1 items-center gap-3 rounded-[22px] bg-pasha-soft px-5 py-4">
              <Search className="h-5 w-5 shrink-0 text-pasha-muted" />
              <input
                ref={searchInputRef}
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search startups, sectors, founders or business needs"
                className="w-full bg-transparent text-base text-pasha-ink placeholder:text-pasha-muted outline-none"
              />
            </div>
            <div className="grid grid-cols-2 sm:flex gap-1 shrink-0">
              <SelectMenu
                value={sector}
                onValueChange={setSector}
                options={sectorOptions}
                placeholder="All sectors"
                searchable
                className="h-auto rounded-[18px] border-0 bg-transparent px-4 py-4 text-sm font-medium text-pasha-ink hover:bg-pasha-stone [&_svg]:text-pasha-ink/50 data-[placeholder]:text-pasha-ink"
              />
              <SelectMenu
                value={stage}
                onValueChange={setStage}
                options={stageOptions}
                placeholder="All stages"
                className="h-auto rounded-[18px] border-0 bg-transparent px-4 py-4 text-sm font-medium text-pasha-ink hover:bg-pasha-stone [&_svg]:text-pasha-ink/50 data-[placeholder]:text-pasha-ink"
              />
            </div>
            <button
              type="submit"
              className="group inline-flex items-center justify-center gap-2 rounded-[22px] bg-pasha-red px-7 py-4 text-sm font-semibold text-white hover:bg-pasha-red-dark transition-colors shrink-0"
            >
              Browse directory
              <ArrowUpRight className="h-5 w-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </motion.form>

          {/* Quick filters */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={ready ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs"
          >
            <span className="text-white/35 mr-1">Popular:</span>
            {QUICK_FILTERS.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => quickFilter(f.sector)}
                className="rounded-full border border-white/10 px-3.5 py-1.5 text-white/65 hover:text-white hover:border-white/30 hover:bg-white/[0.06] transition-colors"
              >
                {f.label}
              </button>
            ))}
            <a
              href="#women-led"
              className="rounded-full border border-white/10 px-3.5 py-1.5 text-white/65 hover:text-white hover:border-white/30 hover:bg-white/[0.06] transition-colors"
            >
              Women-led
            </a>
            <button
              type="button"
              onClick={reset}
              className="rounded-full border border-white/10 px-3.5 py-1.5 text-white/65 hover:text-white hover:border-white/30 hover:bg-white/[0.06] transition-colors"
            >
              View all
            </button>
          </motion.div>
        </div>

        {/* Trust stat strip */}
        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
          animate={ready ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.95 }}
          className="mt-14 grid grid-cols-2 divide-x divide-y sm:divide-y-0 divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] lg:grid-cols-4"
        >
          <StatTile value={`${databankCount.toLocaleString()}+`} label="Member companies" href="#directory" />
          <StatTile value={`${sectors.length}+`} label="Technology sectors" href="#directory" />
          <StatTile value="Women-led" label="Founder spotlight" href="#women-led" accent />
          <StatTile value="Global" label="Award-winning startups" href="#awards" />
        </motion.div>
      </div>
    </section>
  );
}
