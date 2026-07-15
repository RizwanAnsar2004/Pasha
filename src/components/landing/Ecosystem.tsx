import { Kicker } from "./shared/Kicker";
import { Reveal } from "./shared/Reveal";

const CARDS = [
  { letter: "F", title: "Founders", body: "List once, get discovered everywhere — investors, buyers, press, and peers.", tint: "bg-[#CFF2E2]", span: "lg:col-span-5" },
  { letter: "I", title: "Investors", body: "Filter by sector, stage, and traction to build a real deal pipeline.", tint: "bg-[#FFE59A]", span: "lg:col-span-3" },
  { letter: "E", title: "Enterprise", body: "Find vetted vendors and pilot partners without a lengthy RFP process.", tint: "bg-[#DCD2EF]", span: "lg:col-span-4" },
  { letter: "T", title: "Talent", body: "See which product-native startups are hiring and how they're growing.", tint: "bg-[#FFD8D3]", span: "lg:col-span-4" },
  { letter: "P", title: "Policy makers", body: "A live, verified read on the health of Pakistan's product economy.", tint: "bg-[#BFE9EA]", span: "lg:col-span-5" },
  { letter: "G", title: "Global partners", body: "One trusted entry point into Pakistan's startup ecosystem.", tint: "bg-[#171717] text-white", span: "lg:col-span-3", dark: true },
];

export function Ecosystem() {
  return (
    <section id="ecosystem" className="relative bg-white py-20 sm:py-28">
      <div className="site-container">
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
              className={`group relative overflow-hidden rounded-[24px] p-7 min-h-[340px] flex flex-col ${c.span} ${c.tint}`}
            >
              <span
                aria-hidden
                className={`absolute right-4 bottom-2 select-none font-serif font-black leading-none text-[7rem] ${
                  c.dark ? "text-white/[0.08]" : "text-pasha-ink/[0.06]"
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
