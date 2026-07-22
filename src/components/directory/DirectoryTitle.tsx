import { Kicker } from "@/components/landing/shared/Kicker";
import { Reveal } from "@/components/landing/shared/Reveal";

// Same dark hero treatment as About/Contact — eyebrow, bold heading with a red
// last word, lead copy — instead of the old stats banner or the plain title strip.
export function DirectoryTitle() {
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
        <Reveal>
          <Kicker tone="light">PASHA Startup Hub</Kicker>
          <h1 className="mt-5 font-serif font-bold text-3xl sm:text-6xl lg:text-[4.75rem] leading-[0.94] tracking-tight text-white text-balance">
            Discover Pakistan&apos;s startup <span className="text-pasha-red-light">directory.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base sm:text-lg text-white/60 leading-relaxed text-pretty">
            Verified startups across Pakistan, organised by sector, city and stage — search, filter
            and connect with the right founders.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
