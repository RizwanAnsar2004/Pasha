import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Kicker } from "./shared/Kicker";
import { Reveal } from "./shared/Reveal";

const BENEFITS = ["Trusted startup profile", "Global visibility", "Opportunity pathways"];

const STEPS = [
  { n: "01", title: "Build your profile", body: "Tell us about your product, team, and traction — takes about 8 minutes." },
  { n: "02", title: "Complete review", body: "The PASHA committee reviews submissions in fortnightly batches." },
  { n: "03", title: "Start getting discovered", body: "Go live in the directory, searchable by investors, buyers, and press." },
];

export function JoinCTA() {
  return (
    <section id="apply" className="relative bg-pasha-stone py-20 sm:py-28">
      <div className="site-container">
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
              <h2 className="mt-4 font-serif text-3xl sm:text-5xl font-extrabold tracking-tight text-white text-balance">
                Bring your startup into Pakistan’s national startup network.
              </h2>
              <p className="mt-5 text-white/55 text-base sm:text-md leading-relaxed max-w-md text-pretty">
                Create a credible profile, strengthen your visibility and become discoverable to customers, investors, partners, talent and ecosystem programmes.
              </p>

              <div className="mt-7 flex flex-wrap gap-2.5">
                {BENEFITS.map((b) => (
                  <span
                    key={b}
                    className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-regular text-white/70"
                  >
                    {b}
                  </span>
                ))}
              </div>

              <Link
                href="/apply"
                className="group mt-9 inline-flex items-center gap-6 rounded-2xl bg-pasha-red py-3 pl-8 pr-3 shadow-[0_18px_38px_rgba(233,33,39,0.28)] transition-all hover:-translate-y-0.5 hover:bg-pasha-red-dark"
              >
                <span className="flex flex-col items-start">
                  <span className="text-[11px] font-medium uppercase tracking-[1.5px] text-white/70">
                    Ready when you are
                  </span>
                  <span className="text-md sm:text-md font-extrabold text-white">Start your application</span>
                </span>
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-pasha-red transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight className="h-6 w-6" strokeWidth={2.5} />
                </span>
              </Link>
              <p className="mt-3 text-sm text-white/35">Review typically takes about two weeks.</p>
            </div>

            <div className="flex flex-col gap-5">
              {STEPS.map((s) => (
                <div key={s.n} className="flex items-start gap-6 rounded-[20px] bg-white/[0.04] p-6 sm:p-8">
                  <span className="font-serif text-2xl font-black text-pasha-red-light shrink-0">{s.n}</span>
                  <div>
                    <h3 className="font-serif text-2xl sm:text-1xl font-bold text-white">{s.title}</h3>
                    <p className="mt-1.5 text-sm sm:text-sm text-white/50 leading-relaxed">{s.body}</p>
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
