import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { initials, formatNumber } from "@/lib/utils";
import { safeImageSrc } from "@/lib/safe-url";
import { RichText } from "@/components/ui/RichText";
import { Kicker } from "./shared/Kicker";
import { Reveal } from "./shared/Reveal";
import type { WomenLedStartup } from "@/lib/women-led";

export type WomenFounderStartup = WomenLedStartup;

const AVATAR_TINTS = [
  "bg-accent-coral/25 text-[#a64043]",
  "bg-accent-yellow/30 text-[#8a6200]",
  "bg-accent-purple/25 text-[#654d88]",
  "bg-accent-teal/25 text-[#146c6f]",
];

function ProfileCard({ startup, avatarTint }: { startup: WomenLedStartup; avatarTint: string }) {
  const safe = safeImageSrc(startup.logo_url);

  return (
    <Link
      href={`/directory/${startup.slug}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-pasha-ink/10 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(23,23,23,0.08)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full font-bold text-sm ${avatarTint}`}
        >
          {safe ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={safe} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden>{initials(startup.startup_name)}</span>
          )}
        </div>
        {startup.primary_industry && (
          <span className="text-[11px] font-mono uppercase tracking-[1px] text-pasha-ink/45">
            {startup.primary_industry}
          </span>
        )}
      </div>

      <div className="mt-5">
        <h3 className="font-serif text-2xl font-bold text-pasha-ink leading-tight">{startup.startup_name}</h3>
        {startup.tagline ? (
          <RichText inline value={startup.tagline} className="mt-1.5 text-sm text-pasha-ink/60 leading-relaxed line-clamp-2" />
        ) : startup.city ? (
          <span className="mt-1.5 inline-flex items-center gap-1 text-sm text-pasha-ink/60">
            <MapPin className="h-3 w-3" />
            {startup.city}
          </span>
        ) : null}
      </div>

      <div className="mt-5 border-t border-pasha-ink/10 pt-4">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-pasha-ink group-hover:text-pasha-red transition-colors">
          View profile
          <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </span>
      </div>
    </Link>
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

  const shown = startups.slice(0, 4);
  // Keep the 2x2 grid shape (matches the reference design); unfilled slots
  // just render as blank space rather than a placeholder card, and never get
  // padded with real startups that aren't actually women-led.
  const emptySlots = Math.max(0, 4 - shown.length);

  return (
    <section id="women-led" className="relative overflow-hidden bg-accent-coral/[0.08] py-20 sm:py-28">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-[6vw] -top-[8vw] select-none font-serif font-black text-pasha-red/[0.05] leading-none"
        style={{ fontSize: "clamp(16rem, 26vw, 28rem)" }}
      >
        @
      </span>

      <div className="relative site-container">
        <Reveal className="flex flex-wrap items-start justify-between gap-8 mb-12">
          <div className="max-w-xl">
            <Kicker>Women-led startups</Kicker>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl lg:text-5xl font-black tracking-tight text-pasha-ink text-balance">
              Better visibility for the women building what comes next.
            </h2>
          </div>
          <div className="max-w-sm lg:pt-2">
            <Link
              href="/directory?women_led=true"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-pasha-ink hover:text-pasha-red transition-colors underline underline-offset-4"
            >
              Browse women-led profiles
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:row-span-2 lg:col-span-1 relative flex flex-col justify-between overflow-hidden rounded-[28px] bg-pasha-ink p-7 sm:p-8 min-h-[440px]">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-pasha-red/25 blur-[90px]" />
            </div>

            <div className="relative flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-white/45">
                Spotlight collection
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-white/35">01&ndash;04</span>
            </div>

            <div className="relative">
              <span className="text-xs font-bold uppercase tracking-[1.5px] text-pasha-red-light">
                Women-led.
              </span>
              <h3 className="mt-3 font-serif text-3xl sm:text-4xl font-bold text-white leading-tight">
                Built with ambition.
                <br />
                Discovered on merit.
              </h3>
              <p className="relative z-10 mt-4 max-w-[26ch] text-sm text-white/55 leading-relaxed">
                Make women-led startups, their leadership and their progress easier for
                investors, buyers and partners to discover.
              </p>

              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-6 -right-4 grid h-36 w-36 place-items-center rounded-full border border-white/10"
              >
                <span aria-hidden className="absolute h-24 w-24 rounded-full border border-white/10" />
                <span className="font-serif text-7xl font-black leading-none text-pasha-red">@</span>
              </span>
            </div>
          </div>

          {shown.map((startup, i) => (
            <ProfileCard key={startup.id} startup={startup} avatarTint={AVATAR_TINTS[i % AVATAR_TINTS.length]} />
          ))}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div key={`empty-${i}`} aria-hidden />
          ))}
        </div>
      </div>
    </section>
  );
}
