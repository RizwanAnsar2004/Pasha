"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Reveal } from "./shared/Reveal";

const NEWS = [
  {
    label: "Founder guide",
    symbol: "01",
    bg: "bg-pasha-red",
    category: "Founder strategy",
    readTime: "6 min read",
    title: "What enterprise buyers look for in a startup.",
    excerpt: "A practical guide to positioning, proof, security readiness and stakeholder confidence.",
  },
  {
    label: "Ecosystem brief",
    symbol: "@",
    bg: "bg-pasha-ink",
    category: "Market access",
    readTime: "5 min read",
    title: "Building globally from Pakistan: a market-entry checklist.",
    excerpt: "Key questions for founders preparing their company, team and operations for new markets.",
  },
  {
    label: "Women-led",
    symbol: "W",
    bg: "bg-accent-purple",
    category: "Founder stories",
    readTime: "4 min read",
    title: "Why stronger discovery pathways matter for women-led startups.",
    excerpt: "Visibility, networks and trusted introductions can reshape the growth journey.",
  },
  {
    label: "Startup guide",
    symbol: "02",
    bg: "bg-accent-teal",
    category: "AI & data",
    readTime: "5 min read",
    title: "Moving from pilot to production-grade AI.",
    excerpt: "Designing evaluation loops and reliability checks before a launch, not after one.",
  },
  {
    label: "Policy",
    symbol: "#",
    bg: "bg-accent-yellow",
    dark: true,
    category: "Ecosystem",
    readTime: "6 min read",
    title: "What the new startup policy draft means for founders.",
    excerpt: "A plain-language walkthrough of the clauses that matter for product-native companies.",
  },
];

export function NewsCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);

  function step(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("[data-news-card]");
    const width = (card?.offsetWidth ?? 320) + 20;
    track.scrollBy({ left: width * direction, behavior: "smooth" });
  }

  return (
    <section id="news" className="relative bg-white py-20 sm:py-28">
      <div className="site-container">
        <Reveal className="flex flex-wrap items-end justify-between gap-6 mb-10">
          <h2 className="max-w-3xl font-serif text-3xl sm:text-5xl lg:text-[3.6rem] font-black leading-[0.98] tracking-tight text-pasha-ink text-balance">
            News, insight and signals from Pakistan&apos;s startup community.
          </h2>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous"
                className="grid h-11 w-11 place-items-center rounded-full border border-pasha-ink/15 bg-white text-pasha-ink hover:border-pasha-ink/30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next"
                className="grid h-11 w-11 place-items-center rounded-full border border-pasha-ink/15 bg-white text-pasha-ink hover:border-pasha-ink/30 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <Link
              href="/directory"
              className="group inline-flex items-center gap-3 rounded-full bg-pasha-ink pl-5 pr-2 py-2 text-sm font-bold text-white transition-colors hover:bg-pasha-red"
            >
              View all news
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pasha-red text-white transition-colors group-hover:bg-white group-hover:text-pasha-red">
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
            </Link>
          </div>
        </Reveal>

        <div ref={trackRef} className="scrollbar-none flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory">
          {NEWS.map((item) => (
            <article
              key={item.title}
              data-news-card
              className="group shrink-0 snap-start w-[320px] sm:w-[400px] overflow-hidden rounded-[24px] border border-pasha-ink/10 bg-white transition-transform duration-300 hover:-translate-y-1"
            >
              <div className={`relative h-64 ${item.bg} px-5 py-4 flex flex-col justify-between overflow-hidden`}>
                <span
                  className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[1.5px] ${
                    item.dark ? "border-pasha-ink/30 text-pasha-ink" : "border-white/40 text-white"
                  }`}
                >
                  {item.label}
                </span>
                <span
                  aria-hidden
                  className={`absolute -bottom-10 -right-6 grid h-40 w-40 place-items-center rounded-full border ${
                    item.dark ? "border-pasha-ink/15" : "border-white/25"
                  }`}
                >
                  <span
                    className={`font-serif text-6xl font-black leading-none ${item.dark ? "text-pasha-ink" : "text-white"}`}
                  >
                    {item.symbol}
                  </span>
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[1px] text-pasha-ink/40">
                  <span>{item.category}</span>
                  <span>{item.readTime}</span>
                </div>
                <h3 className="mt-2.5 font-serif text-xl font-bold text-pasha-ink leading-snug">{item.title}</h3>
                <p className="mt-2 text-sm text-pasha-ink/55 leading-relaxed line-clamp-2">{item.excerpt}</p>
                <div className="mt-4 border-t border-pasha-ink/10 pt-4">
                  <Link
                    href="/directory"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-pasha-ink group-hover:text-pasha-red transition-colors"
                  >
                    Read article
                    <ArrowUpRight className="h-3.5 w-3.5 text-pasha-red" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
