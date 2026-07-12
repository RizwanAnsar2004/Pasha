import { Kicker } from "./shared/Kicker";
import { Reveal } from "./shared/Reveal";
import { PillButton } from "./shared/PillButton";

const BENEFITS = ["Verified profile", "National visibility", "Buyer discovery"];

const STEPS = [
  { n: "01", title: "Build your profile", body: "Tell us about your product, team, and traction — takes about 8 minutes." },
  { n: "02", title: "Complete review", body: "The P@SHA committee reviews submissions in fortnightly batches." },
  { n: "03", title: "Start getting discovered", body: "Go live in the directory, searchable by investors, buyers, and press." },
];

export function JoinCTA() {
  return (
    <section id="apply" className="relative bg-pasha-stone py-20 sm:py-28">
      <div className="mx-auto max-w-[1480px] px-5 sm:px-8">
        <Reveal className="relative overflow-hidden rounded-[32px] bg-pasha-ink px-6 py-12 sm:px-12 sm:py-16">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-pasha-red/25 blur-[110px]" />
            <span className="absolute -right-8 -bottom-16 select-none font-serif font-black text-white/[0.05] leading-none text-[18rem]">
              @
            </span>
          </div>

          <div className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12">
            <div>
              <Kicker tone="light">Join the directory</Kicker>
              <h2 className="mt-4 font-serif text-5xl sm:text-6xl font-extrabold tracking-tight text-white text-balance">
                Put your startup where the right people can find it.
              </h2>
              <p className="mt-5 text-white/55 text-xl sm:text-2xl leading-relaxed max-w-md text-pretty">
                No fee, no equity — just a real committee review and a public profile built to convert.
              </p>

              <div className="mt-7 flex flex-wrap gap-2.5">
                {BENEFITS.map((b) => (
                  <span
                    key={b}
                    className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white/70"
                  >
                    {b}
                  </span>
                ))}
              </div>

              <PillButton href="/apply" variant="solid" dot={false} className="mt-9 py-4 px-8 text-lg font-semibold">
                Start your application
              </PillButton>
              <p className="mt-3 text-sm text-white/35">Review typically takes about two weeks.</p>
            </div>

            <div className="flex flex-col gap-5 rounded-[24px] bg-white/[0.04] border border-white/10 p-7 sm:p-8">
              {STEPS.map((s) => (
                <div key={s.n} className="flex gap-4">
                  <span className="font-mono text-sm text-pasha-red-light font-bold shrink-0 pt-1">{s.n}</span>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-white">{s.title}</h3>
                    <p className="mt-1.5 text-base text-white/50 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
