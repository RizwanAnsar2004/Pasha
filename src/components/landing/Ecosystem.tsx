import { Lightbulb, CircleDollarSign, Briefcase, GraduationCap, Landmark, Globe } from "lucide-react";
import { Kicker } from "./shared/Kicker";
import { Reveal } from "./shared/Reveal";

const CARDS = [
  { icon: Lightbulb, iconColor: "text-[#6FA98C]", title: "Founders", body: "List once, get discovered everywhere — investors, buyers, press, and peers.", tint: "bg-[#CFF2E2]", span: "lg:col-span-5" },
  { icon: CircleDollarSign, iconColor: "text-[#B8952E]", title: "Investors", body: "Filter by sector, stage, and traction to build a real deal pipeline.", tint: "bg-[#FFE59A]", span: "lg:col-span-3" },
  { icon: Briefcase, iconColor: "text-[#8E7BC2]", title: "Enterprise", body: "Find vetted vendors and pilot partners without a lengthy RFP process.", tint: "bg-[#DCD2EF]", span: "lg:col-span-4" },
  { icon: GraduationCap, iconColor: "text-[#C97A72]", title: "Talent", body: "See which product-native startups are hiring and how they're growing.", tint: "bg-[#FFD8D3]", span: "lg:col-span-4" },
  { icon: Landmark, iconColor: "text-[#5DA0A3]", title: "Policy makers", body: "A live, verified read on the health of Pakistan's product economy.", tint: "bg-[#BFE9EA]", span: "lg:col-span-5" },
  { icon: Globe, iconColor: "text-[#5B7FBF]", title: "Global partners", body: "One trusted entry point into Pakistan's startup ecosystem.", tint: "bg-[#DCE6FA]", span: "lg:col-span-3" },
];

export function Ecosystem() {
  return (
    <section id="ecosystem" className="relative bg-white py-20 sm:py-28">
      <div className="site-container">
        <Reveal className="max-w-4xl mb-12">
          <Kicker>One national platform. Many pathways.</Kicker>
          <h2 className="mt-4 font-serif text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-pasha-ink text-balance">
            Built for everyone who helps startups move forward.
          </h2>
        </Reveal>

        <Reveal delay={0.05} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5">
          {CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.title}
                className={`group relative overflow-hidden rounded-[24px] p-7 min-h-[340px] flex flex-col ${c.span} ${c.tint}`}
              >
                <Icon aria-hidden className={`absolute right-8 bottom-8 h-16 w-16 ${c.iconColor}`} strokeWidth={1.5} />
                <div className="relative">
                  <h3 className="font-serif text-3xl font-bold text-pasha-ink">{c.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-pasha-ink/99">
                    {c.body}
                  </p>
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
