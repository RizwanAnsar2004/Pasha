import { Reveal } from "./shared/Reveal";

const PILLARS = [
  {
    n: "01",
    title: "Make discovery easier",
    body: "One searchable index instead of scattered LinkedIn threads and cold outreach — every verified startup, one place.",
  },
  {
    n: "02",
    title: "Build market trust",
    body: "The P@SHA verified badge tells investors and partners a real committee has looked at the basics.",
  },
  {
    n: "03",
    title: "Connect opportunity",
    body: "Featured tier startups get warm introductions to investors, corporate buyers, and pilot programs.",
  },
  {
    n: "04",
    title: "Show global ambition",
    body: "Award-winning founders and women-led teams get the spotlight they've earned on the world stage.",
  },
];

export function Manifesto() {
  return (
    <section className="relative bg-white py-20 sm:py-28 overflow-hidden">
      <div className="site-container">
        <Reveal className="">
          <p className="font-serif font-bold text-[clamp(2.1rem,4vw,3.4rem)] leading-[1.2] tracking-tight text-pasha-ink text-balance">
            A startup directory should do more than list names.{" "}
            <em className="not-italic text-pasha-red">It should open doors.</em>
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">
          <Reveal delay={0.05} className="relative min-h-[320px] overflow-hidden rounded-[28px] bg-pasha-ink p-8 sm:p-10 flex flex-col justify-between">
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

          <Reveal delay={0.1} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {PILLARS.map((p) => (
              <div key={p.n}>
                <span className="font-mono text-lg text-pasha-red font-semibold">{p.n}</span>
                <h3 className="mt-2 font-serif text-xl font-bold text-pasha-ink">{p.title}</h3>
                <p className="mt-2 text-base text-pasha-muted leading-relaxed">{p.body}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
