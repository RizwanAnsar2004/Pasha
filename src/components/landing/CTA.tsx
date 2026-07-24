import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Kicker } from "./shared/Kicker";
import { Reveal } from "./shared/Reveal";

export function CTA() {
  return (
    <section className="relative bg-pasha-stone py-20 sm:py-28">
      <div className="site-container">
        <Reveal className="relative overflow-hidden rounded-[32px] bg-pasha-ink px-6 py-14 sm:px-14 sm:py-20">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-16 select-none font-serif font-black text-white/[0.04] leading-none text-[19rem]"
          >
            @
          </span>
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-pasha-red/25 blur-[110px]" />

          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-end">
            <div>
              <Kicker tone="light">Join the Hub</Kicker>
              <h2 className="mt-4 font-serif text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white text-balance">
                Ready to take your place in the PASHA Startup Hub?
              </h2>
            </div>
            <div>
              <p className="text-white/55 text-xl leading-relaxed text-pretty">
                Join a trusted national platform designed to help Pakistani startups be discovered, connected, recognised and taken to the world.
              </p>
              <Link
                href="/apply"
                className="group mt-6 flex w-full sm:w-auto items-center gap-6 rounded-2xl bg-white py-3 pl-7 pr-3 shadow-[0_18px_38px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-0.5"
              >
                <span className="flex flex-1 sm:flex-none flex-col items-start">
                  <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-pasha-red">
                    Join the Hub
                  </span>
                  <span className="text-base sm:text-lg font-extrabold text-pasha-ink">Register Your Startup</span>
                </span>
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-pasha-red text-white transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight className="h-6 w-6" strokeWidth={2.5} />
                </span>
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
