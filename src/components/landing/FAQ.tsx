"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Kicker } from "./shared/Kicker";
import { Reveal } from "./shared/Reveal";

const EASE = [0.22, 1, 0.36, 1] as const;

const FAQS = [
  {
    q: "How can I showcase my startup to Pakistan's tech ecosystem?",
    a: "Create a verified startup profile and get listed once, discovered everywhere — by investors, enterprise buyers, press, talent, and peers. PASHA's verification badge adds credibility to everything you share.",
  },
  {
    q: "How do I connect with investors and funding opportunities?",
    a: "Investors browse the directory by sector, stage, city, and traction to build their pipeline, so a complete, verified profile puts you in front of them. Dedicated investor interest workflows are expanding as the platform grows.",
  },
  {
    q: "How can I find mentors and industry experts?",
    a: "The Hub connects you to PASHA's network of mentors and experienced operators, who contribute guidance, expertise, and opportunities through the Hub team and its programmes.",
  },
  {
    q: "Where can I discover startup events, competitions, and programs?",
    a: "The Events section surfaces upcoming programmes, competitions, and community gatherings across the ecosystem — including PASHA's own initiatives — so you always know what's next.",
  },
  {
    q: "How can I connect with incubators, accelerators, and innovation hubs?",
    a: "The Hub is one trusted entry point into Pakistan's ecosystem, linking founders with incubators, accelerators, and innovation partners. Highlight your incubation history on your profile and find programmes suited to your stage.",
  },
  {
    q: "How do I find potential customers and business partners?",
    a: "Enterprises use the Hub to find vetted local vendors and pilot partners without a lengthy RFP. A strong profile makes your solution discoverable to companies looking for what you build.",
  },
  {
    q: "How can I hire talent or join a startup team?",
    a: "Talent explores the Hub to see which startups are growing and hiring. Founders can signal they're hiring on their profile; jobseekers can discover startups by sector, stage, and momentum.",
  },
  {
    q: "Where can I access startup resources, guides, and templates?",
    a: "Through the Hub and PASHA's wider capacity-building work — career resources, salary surveys, and industry insights — you get the knowledge and tools to build and scale with confidence.",
  },
  {
    q: "How can I increase my startup's visibility and credibility?",
    a: "A complete profile plus PASHA's verification badge is your credibility signal. More complete profiles rank higher and become more discoverable to investors, buyers, and partners.",
  },
  {
    q: "How do I become part of Pakistan's startup community?",
    a: "Join the Hub — create your account and build your profile to plug into Pakistan's national startup network: a 1600+ member ecosystem, events, mentors, and the people moving it forward.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative bg-white py-20 sm:py-28">
      <div className="site-container">
        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
          <Reveal>
            <div className="lg:sticky lg:top-20">
              <Kicker>Frequently asked</Kicker>
              <h2 className="mt-4 font-serif text-3xl sm:text-5xl font-extrabold tracking-tight text-pasha-ink text-balance">
                How Can the Hub Help You?
              </h2>
              <p className="mt-4 text-pasha-muted leading-relaxed max-w-sm">
                Clear questions for the people participating in the ecosystem.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="border-t border-pasha-line">
              {FAQS.map((faq, i) => {
                const isOpen = openIndex === i;
                return (
                  <div key={faq.q} className="border-b border-pasha-line">
                    <button
                      type="button"
                      onClick={() => setOpenIndex(isOpen ? null : i)}
                      className="w-full text-left flex items-center justify-between gap-4 py-6"
                      aria-expanded={isOpen}
                    >
                      <span className={`text-lg sm:text-xl font-bold ${isOpen ? "text-pasha-ink" : "text-pasha-ink/75"}`}>
                        {faq.q}
                      </span>
                      <motion.span
                        animate={{ rotate: isOpen ? 45 : 0 }}
                        transition={{ duration: 0.3, ease: EASE }}
                        className={`shrink-0 grid h-8 w-8 place-items-center rounded-full ${
                          isOpen ? "bg-pasha-red text-white" : "bg-pasha-stone text-pasha-ink/60"
                        }`}
                      >
                        <Plus className="h-4 w-4" strokeWidth={2} />
                      </motion.span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <p className="pb-6 text-pasha-muted leading-relaxed text-pretty max-w-2xl">{faq.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
