import { Kicker } from "./shared/Kicker";
import { Reveal } from "./shared/Reveal";

const CARDS = [
  { letter: "F", title: "Founders", body: "List once, get discovered everywhere — investors, buyers, press, and peers.", tint: "bg-accent-green/[0.16] border-accent-green/25", span: "lg:col-span-5" },
  { letter: "I", title: "Investors", body: "Filter by sector, stage, and traction to build a real deal pipeline.", tint: "bg-accent-yellow/[0.2] border-accent-yellow/30", span: "lg:col-span-3" },
  { letter: "E", title: "Enterprise", body: "Find vetted vendors and pilot partners without a lengthy RFP process.", tint: "bg-accent-purple/[0.16] border-accent-purple/25", span: "lg:col-span-4" },
  { letter: "T", title: "Talent", body: "See which product-native startups are hiring and how they're growing.", tint: "bg-accent-coral/[0.16] border-accent-coral/25", span: "lg:col-span-4" },
  { letter: "P", title: "Policy makers", body: "A live, verified read on the health of Pakistan's product economy.", tint: "bg-accent-teal/[0.16] border-accent-teal/25", span: "lg:col-span-5" },
  { letter: "G", title: "Global partners", body: "One trusted entry point into Pakistan's startup ecosystem.", tint: "bg-pasha-ink text-white", span: "lg:col-span-3", dark: true },
];

export function Ecosystem() {
  return (
    <section id="ecosystem" className="relative bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-[1480px] px-5 sm:px-8">
        <Reveal className="max-w-4xl mb-12">
          <Kicker>One connected ecosystem</Kicker>
          <h2 className="mt-4 font-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-pasha-ink text-balance">
            For everyone helping startups move forward.
          </h2>
        </Reveal>

        <Reveal delay={0.05} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5">
          {CARDS.map((c) => (
            <div
              key={c.letter}
              className={`group relative overflow-hidden rounded-[24px] border p-7 min-h-[200px] flex flex-col justify-between ${c.span} ${
                c.dark ? "border-white/10" : c.tint
              } ${c.dark ? c.tint : ""}`}
            >
              <span
                aria-hidden
                className={`absolute -right-3 -bottom-6 select-none font-serif font-black leading-none text-[8rem] ${
                  c.dark ? "text-white/[0.08]" : "text-pasha-ink/[0.06]"
                }`}
              >
                {c.letter}
              </span>
              <span
                className={`relative grid h-10 w-10 place-items-center rounded-full font-serif text-sm font-bold ${
                  c.dark ? "bg-white/10 text-white" : "bg-white/70 text-pasha-ink"
                }`}
              >
                {c.letter}
              </span>
              <div className="relative">
                <h3 className={`font-serif text-2xl font-bold ${c.dark ? "text-white" : "text-pasha-ink"}`}>{c.title}</h3>
                <p className={`mt-2 text-base leading-relaxed ${c.dark ? "text-white/55" : "text-pasha-ink/60"}`}>
                  {c.body}
                </p>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
