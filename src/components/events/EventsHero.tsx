import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Kicker } from "@/components/landing/shared/Kicker";
import { Reveal } from "@/components/landing/shared/Reveal";

// Compact display for a seat total — 5000 -> "5,000+", 0 -> null so the tile
// can be hidden rather than claiming a number we don't have.
function seatLabel(seats: number): string | null {
  if (seats <= 0) return null;
  return `${seats.toLocaleString("en-US")}+`;
}

export function EventsHero({
  totalEvents,
  totalSeats,
  totalCities,
}: {
  totalEvents: number;
  totalSeats: number;
  totalCities: number;
}) {
  const seats = seatLabel(totalSeats);
  const cities = totalCities > 0 ? `${totalCities}` : null;
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
            <Kicker tone="light">Community Events</Kicker>
            <h1 className="mt-5 font-serif font-extrabold text-3xl sm:text-6xl lg:text-[4.75rem] leading-[0.94] tracking-tight text-white text-balance">
              Where Pakistan&apos;s{" "}
              <span className="text-pasha-red-light">ecosystem connects.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base sm:text-lg text-white/60 leading-relaxed text-pretty">
              Webinars, seminars, and gatherings for founders, investors, and
              ecosystem enablers across Pakistan — curated by PASHA.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link
                href="/apply"
                className="inline-flex items-center gap-3 rounded-2xl bg-pasha-red pl-5 pr-2.5 py-2.5 text-sm font-bold text-white shadow-[0_18px_38px_rgba(233,33,39,0.24)] transition-all hover:-translate-y-0.5 hover:bg-pasha-red-dark"
              >
                Host an event with PASHA
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-pasha-red">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </Link>
              <Link
                href="#events"
                className="text-sm font-semibold text-white/75 border-b border-white/30 pb-1 hover:text-white hover:border-white transition-colors"
              >
                Browse events <span aria-hidden>&rarr;</span>
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2.5">
              {["Curated by PASHA", "Nationwide coverage", "Founder-first"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 text-xs text-white/45">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#31B57B]" />
                  {t}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <aside
              aria-label="Events index summary"
              className="overflow-hidden rounded-[26px] border border-white/12 bg-white/[0.06] backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-[11px] font-bold uppercase tracking-[1.5px] text-white/45">
                Upcoming
                <span className="h-2 w-2 rounded-full bg-[#31B57B] shadow-[0_0_0_6px_rgba(49,181,123,0.15)]" />
              </div>

              <div className="px-5 pt-6 pb-5">
                <div className="font-serif text-5xl sm:text-6xl font-extrabold tracking-tight text-white">
                  {totalEvents}
                </div>
                <div className="mt-2 text-sm text-white/50">events scheduled</div>
              </div>

              {/* Derived from the published events themselves — the tile is
                  dropped entirely when there's nothing real to show. */}
              {(seats || cities) && (
                <div className="grid grid-cols-2 divide-x divide-white/[0.09] border-t border-white/10">
                  {seats && (
                    <div className="p-4">
                      <strong className="block font-serif text-xl font-bold text-white">{seats}</strong>
                      <span className="mt-1.5 block text-[10px] leading-snug text-white/45">seats available</span>
                    </div>
                  )}
                  {cities && (
                    <div className="p-4">
                      <strong className="block font-serif text-xl font-bold text-white">{cities}</strong>
                      <span className="mt-1.5 block text-[10px] leading-snug text-white/45">
                        {totalCities === 1 ? "city" : "cities"} hosting
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between px-5 py-4 text-xs text-white/55">
                <span>Webinars, summits &amp; workshops</span>
                <b className="text-pasha-red-light font-bold">Updated weekly</b>
              </div>
            </aside>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
