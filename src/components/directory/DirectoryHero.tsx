import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Kicker } from "@/components/landing/shared/Kicker";
import { Reveal } from "@/components/landing/shared/Reveal";
import { formatNumber } from "@/lib/utils";

export type DirectoryHeroStats = {
  totalStartups: number;
  sectorCount: number;
  cityCount: number;
};

// Only the three counters wait on the database; the rest paints on first flush.
export function DirectoryHero({ stats }: { stats: Promise<DirectoryHeroStats> }) {
  return (
    <section className="relative overflow-hidden bg-pasha-ink pt-16 pb-14 sm:pt-20 sm:pb-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
      />
      <div aria-hidden className="pointer-events-none absolute -right-56 -top-72 h-[720px] w-[720px] rounded-full bg-pasha-red/[0.32] blur-[80px]" />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-56 -right-16 select-none font-serif font-black leading-none text-white/[0.02]"
        style={{ fontSize: "clamp(20rem,34vw,36rem)" }}
      >
        @
      </span>

      <div className="relative site-container">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 lg:gap-16 items-center">
          <Reveal>
            <Kicker tone="light">P@SHA Startup Hub</Kicker>
            <h1 className="mt-5 font-serif font-extrabold text-3xl sm:text-6xl lg:text-[4.75rem] leading-[0.94] tracking-tight text-white text-balance">
              Pakistan&apos;s startup ecosystem,{" "}
              <span className="text-pasha-red-light">clearly indexed.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base sm:text-lg text-white/60 leading-relaxed text-pretty">
              Discover verified startups and founder-led companies across Pakistan — organised by
              sector, city and stage for investors, customers, partners and talent.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link
                href="#directory"
                className="inline-flex items-center gap-3 rounded-2xl bg-pasha-red pl-5 pr-2.5 py-2.5 text-sm font-bold text-white shadow-[0_18px_38px_rgba(233,33,39,0.24)] transition-all hover:-translate-y-0.5 hover:bg-pasha-red-dark"
              >
                Explore startups
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-pasha-red">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </Link>
              <Link
                href="/apply"
                className="text-sm font-semibold text-white/75 border-b border-white/30 pb-1 hover:text-white hover:border-white transition-colors"
              >
                List your startup <span aria-hidden>&rarr;</span>
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2.5">
              {["Verified profiles", "Curated categories", "Pakistan-wide coverage"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 text-xs text-white/45">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#31B57B]" />
                  {t}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <aside
              aria-label="Directory index summary"
              className="overflow-hidden rounded-[26px] border border-white/12 bg-white/[0.06] backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-[11px] font-bold uppercase tracking-[1.5px] text-white/45">
                Live index
                <span className="h-2 w-2 rounded-full bg-[#31B57B] shadow-[0_0_0_6px_rgba(49,181,123,0.15)]" />
              </div>

              <Suspense fallback={<HeroStatsFallback />}>
                <HeroStats stats={stats} />
              </Suspense>

              <div className="flex items-center justify-between px-5 py-4 text-xs text-white/55">
                <span>Searchable by sector, location and stage</span>
                <b className="text-pasha-red-light font-bold">Updated weekly</b>
              </div>
            </aside>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// Resolves once the counts land; React streams it into the shell already on screen.
async function HeroStats({ stats }: { stats: Promise<DirectoryHeroStats> }) {
  const { totalStartups, sectorCount, cityCount } = await stats;
  return (
    <>
      <div className="px-5 pt-6 pb-5">
        <div className="font-serif text-5xl sm:text-6xl font-extrabold tracking-tight text-white">
          {formatNumber(totalStartups)}
        </div>
        <div className="mt-2 text-sm text-white/50">verified startup profiles</div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-white/[0.09] border-t border-white/10">
        <div className="p-4">
          <strong className="block font-serif text-xl font-bold text-white">{sectorCount}</strong>
          <span className="mt-1.5 block text-[13px] leading-snug text-white/55">technology sectors</span>
        </div>
        <div className="p-4">
          <strong className="block font-serif text-xl font-bold text-white">{cityCount}</strong>
          <span className="mt-1.5 block text-[13px] leading-snug text-white/55">startup cities</span>
        </div>
        <div className="p-4">
          <strong className="block font-serif text-xl font-bold text-white">5+</strong>
          <span className="mt-1.5 block text-[13px] leading-snug text-white/55">verification sources</span>
        </div>
      </div>
    </>
  );
}

// Same box metrics as HeroStats so the card never resizes when counts land.
function HeroStatsFallback() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="px-5 pt-6 pb-5">
        <div className="h-[3.75rem] w-40 rounded-lg bg-white/10" />
        <div className="mt-2 h-5 w-44 rounded bg-white/[0.06]" />
      </div>
      <div className="grid grid-cols-3 divide-x divide-white/[0.09] border-t border-white/10">
        {[0, 1, 2].map((i) => (
          <div key={i} className="p-4">
            <div className="h-7 w-8 rounded bg-white/10" />
            <div className="mt-1.5 h-[2.4rem] w-full rounded bg-white/[0.06]" />
          </div>
        ))}
      </div>
    </div>
  );
}
