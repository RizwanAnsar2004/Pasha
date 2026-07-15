import { Kicker } from "./shared/Kicker";
import { Reveal } from "./shared/Reveal";
import { PillButton } from "./shared/PillButton";

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
              <Kicker tone="light">Build visibility that compounds</Kicker>
              <h2 className="mt-4 font-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white text-balance">
                Ready to make your startup easier to discover?
              </h2>
            </div>
            <div>
              <p className="text-white/55 text-xl leading-relaxed text-pretty">
                Takes about 8 minutes. Review by the committee within two weeks. Featured tier
                startups get priority introductions and showcases.
              </p>
              <PillButton href="/apply" variant="solid" dot={false} className="mt-6">
                Start your application
              </PillButton>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
