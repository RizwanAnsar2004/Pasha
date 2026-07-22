import { Kicker } from "./shared/Kicker";
import { Reveal } from "./shared/Reveal";

const STATS = [
  { value: "2,485", label: "Startup profiles" },
  { value: "78", label: "Technology sectors" },
  { value: "12", label: "Startup cities" },
];

export function StartupDiscovery() {
  return (
    <section id="startup-discovery" className="relative overflow-hidden bg-pasha-red py-20 sm:py-28 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[420px] -right-[105px] h-[610px] w-[610px] rounded-full border border-white/[0.17] shadow-[0_0_0_96px_rgba(255,255,255,0.025),0_0_0_196px_rgba(255,255,255,0.018)]" />
        <div className="absolute -bottom-[520px] -right-[390px] h-[720px] w-[720px] rounded-full bg-white/[0.018]" />
      </div>

      <div className="site-container relative grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.08fr_0.82fr] lg:gap-24">
        <Reveal>
          <Kicker tone="light">Startup discovery</Kicker>
          <h2 className="mt-5 max-w-3xl text-balance font-serif text-4xl font-extrabold leading-[0.96] tracking-[-0.065em] sm:text-6xl lg:text-7xl">
            Discover the startups building Pakistan&apos;s future.
          </h2>
          <p className="mt-6 max-w-xl text-base leading-[1.78] text-white/85 sm:text-lg">
            The directory remains an important part of the Hub—but now as its discovery engine,
            supported by richer profiles, verification signals and ecosystem pathways.
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <form
            action="/directory"
            method="get"
            className="rounded-[28px] bg-white p-6 text-pasha-ink shadow-[0_26px_75px_rgba(116,0,4,0.24)] sm:p-7"
          >
            <label
              htmlFor="startup-discovery-search"
              className="mb-2.5 block text-xs font-extrabold uppercase tracking-[2px] text-pasha-ink/60"
            >
              Search the directory
            </label>
            <div className="flex gap-2.5">
              <input
                id="startup-discovery-search"
                name="q"
                type="text"
                placeholder="Search by startup"
                className="h-[68px] min-w-0 flex-1 rounded-2xl border border-pasha-ink/12 px-5 text-base text-pasha-ink outline-none transition focus:border-pasha-red focus:ring-4 focus:ring-pasha-red/10"
              />
              <button
                type="submit"
                className="h-[68px] min-w-[116px] shrink-0 rounded-full bg-pasha-red text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-pasha-red-dark"
              >
                Search
              </button>
            </div>

            <div className="mt-6 grid grid-cols-3 border-t border-pasha-ink/10 pt-5">
              {STATS.map((stat, i) => (
                <div
                  key={stat.label}
                  className={`px-2 sm:px-3 ${i < STATS.length - 1 ? "border-r border-pasha-ink/10" : ""}`}
                >
                  <strong className="block font-serif text-2xl font-extrabold tracking-[-0.055em] text-pasha-ink">
                    {stat.value}
                  </strong>
                  <span className="mt-3 block text-[11px] text-pasha-ink/55">{stat.label}</span>
                </div>
              ))}
            </div>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
