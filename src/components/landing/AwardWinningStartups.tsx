import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Kicker } from "./shared/Kicker";
import { Reveal } from "./shared/Reveal";

export type AwardWinningStartup = {
  id: string;
  startup_name: string;
  primary_industry?: string | null;
  city?: string | null;
  awards?: string | null;
  pasha_verified?: boolean | null;
};

const JUNK_PATTERNS = [
  /^https?:\/\//i,
  /^no formal/i,
  /^none$/i,
  /^n\/a$/i,
  /^-+$/,
];

// All meaningful award lines for a startup (a startup can win several).
function awardLines(awards?: string | null): string[] {
  if (!awards) return [];
  return awards
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !JUNK_PATTERNS.some((p) => p.test(l)));
}

export function AwardWinningStartups({ startups }: { startups: AwardWinningStartup[] }) {
  // Awards are admin-curated (Admin → Award Winners).
  const winners = startups
    .map((s) => ({ ...s, titles: awardLines(s.awards) }))
    .filter((s) => s.titles.length > 0)
    .slice(0, 4);

  if (winners.length === 0) return null;

  return (
    <section id="awards" className="relative bg-pasha-ink py-20 sm:py-28 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 -left-24 w-[520px] h-[520px] rounded-full bg-pasha-red/[0.12] blur-[140px]" />
        <div className="absolute -bottom-32 -right-20 w-[480px] h-[480px] rounded-full bg-accent-yellow/[0.06] blur-[140px]" />
      </div>

      <div className="relative site-container">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16">
          <Reveal>
            <Kicker tone="light">Recognition</Kicker>
            <h2 className="mt-4 font-serif text-3xl sm:text-5xl lg:text-5xl font-extrabold tracking-tight text-white text-balance">
              Built to win on the world stage.
            </h2>
            <p className="mt-4 text-white/55 text-base leading-relaxed text-pretty max-w-md">
              Recognised by P@SHA and industry partners for outstanding products, growth, and impact.
            </p>
            <Link
              href="/directory"
              className="group mt-6 inline-flex items-center gap-3 rounded-full border border-white/25 bg-white/[0.06] py-2.5 pl-5 pr-2.5 text-xs font-regular text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-pasha-ink"
            >
              View all awards
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pasha-red text-white">
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
            </Link>
          </Reveal>

          <Reveal delay={0.1} className="min-w-0">
            <ol className="border-t border-white/10">
              {winners.map((winner, i) => {
                const meta = [winner.primary_industry, winner.city].filter(Boolean).join(" · ");
                return (
                  <li key={winner.id} className="border-b border-white/10">
                    <Link
                      href="/directory"
                      className="group flex items-center gap-5 py-6 transition-transform duration-300 hover:translate-x-2"
                    >
                      <span className="font-mono text-sm text-white/30 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-serif text-1xl sm:text-xl font-bold text-white group-hover:text-pasha-red-light transition-colors">
                            {winner.startup_name}
                          </span>
                          {meta && <span className="text-xs text-white/35">{meta}</span>}
                        </span>
                        <span className="mt-1 block text-xs text-white/45 truncate">
                          {winner.titles.join(" · ")}
                        </span>
                      </span>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 text-white/50 group-hover:bg-pasha-red group-hover:border-pasha-red group-hover:text-white transition-all">
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
