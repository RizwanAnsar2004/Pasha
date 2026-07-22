"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Kicker } from "./shared/Kicker";
import { Reveal } from "./shared/Reveal";

const EASE = [0.22, 1, 0.36, 1] as const;

const FAQS = [
  {
    q: "What is the benefit for founders?",
    a: "Founders can create credible startup profiles, strengthen visibility and become discoverable to customers, investors, partners, talent, programmes and relevant recognition opportunities.",
  },
  {
    q: "What can investors discover?",
    a: "Investors can explore companies using sector, stage, city, verification and other profile context. Dedicated investor onboarding and interest workflows are planned as the platform expands.",
  },
  {
    q: "How can enterprises participate?",
    a: "Enterprises can identify locally built solutions, share relevant opportunities, support programmes and connect with startups working on real business challenges.",
  },
  {
    q: "How are startup profiles verified?",
    a: "The verified indicator is shown only where PASHA has reviewed the relevant profile information under the Hub's verification process. It is not a commercial endorsement or investment recommendation.",
  },
  {
    q: "Can ecosystem partners contribute?",
    a: "Mentors, community partners and global organisations can contribute expertise, opportunities, events, partnerships and market-access pathways through the Hub team.",
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
                What does the Hub offer you?
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
