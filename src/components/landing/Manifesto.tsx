import { Reveal } from "./shared/Reveal";

const PILLARS = [
  {
    n: "01",
    title: "Discover potential",
    body: "Make credible startups, founders and locally built solutions easier to find.",
  },
  {
    n: "02",
    title: "Build capability",
    body: "Equip founders with practical knowledge, visibility and pathways to become market-ready.",
  },
  {
    n: "03",
    title: "Connect opportunity",
    body: "Bring startups closer to customers, investors, mentors, talent and ecosystem partners.",
  },
  {
    n: "04",
    title: "Global Visibility",
    body: "Showcase Pakistan's startup innovation nationally and internationally.",
  },
];

export function Manifesto() {
  return (
    <section className="relative bg-white py-20 sm:py-28 lg:py-36">
      <div className="site-container">
        <Reveal>
          <h2 className="max-w-5xl font-serif text-2xl sm:text-6xl font-bold leading-[0.94] tracking-[-0.03em] text-pasha-ink text-balance">
            A startup ecosystem grows when{" "}
            <em className="not-italic text-pasha-red">opportunity is easier to reach.</em>
          </h2>
        </Reveal>

        <div className="mt-14 sm:mt-20 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-24 items-start">
          <Reveal
            delay={0.05}
            className="relative flex min-h-[320px] sm:min-h-[420px] lg:min-h-[510px] flex-col justify-start gap-5 overflow-hidden rounded-2xl bg-pasha-ink p-8 sm:p-10"
          >
            <div aria-hidden className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-br from-pasha-red/25 via-transparent to-accent-teal/25" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.1)_1px,transparent_0)] bg-[size:26px_26px]" />
              <div className="absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-pasha-red/30 blur-[100px]" />
              <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-accent-teal/25 blur-[100px]" />
            </div>
            <span
              aria-hidden
              className="absolute -right-6 -bottom-10 select-none font-serif font-black text-white/[0.08] leading-none text-[16rem]"
            >
              @
            </span>

            <span className="relative w-fit rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[1.5px] text-white/70">
              Why it matters
            </span>
            <p className="relative font-serif text-2xl sm:text-3xl font-bold text-white leading-snug max-w-sm">
              Built to connect verified startups with the people who can help them grow.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="grid grid-cols-1 sm:grid-cols-2 border-t border-l border-pasha-line">
            {PILLARS.map((p) => (
              <div key={p.n} className="min-h-[200px] sm:min-h-[255px] border-r border-b border-pasha-line p-7 sm:p-8">
                <span className="font-serif text-3xl sm:text-4xl font-bold tracking-[-0.05em] text-pasha-red">
                  {p.n}
                </span>
                <h3 className="mt-6 font-serif text-lg font-bold text-pasha-ink">{p.title}</h3>
                <p className="mt-2.5 text-[13px] text-pasha-muted leading-relaxed">{p.body}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
