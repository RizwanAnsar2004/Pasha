"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Kicker } from "./shared/Kicker";
import { Reveal } from "./shared/Reveal";

const EASE = [0.22, 1, 0.36, 1] as const;

const FAQS = [
  {
    q: "Who can apply to PSEC?",
    a: "Any product-native startup founded or headquartered in Pakistan. We focus on companies building scalable, IP-owning solutions — SaaS, marketplaces, apps, platforms, deep tech. Services agencies are welcome at other P@SHA committees but not this one.",
  },
  {
    q: "Is there a cost to apply or join?",
    a: "No. There's no application fee, no membership fee, and we don't take equity. The directory and community are funded by P@SHA's ecosystem partners.",
  },
  {
    q: "What does 'P@SHA verified' actually mean?",
    a: "The badge confirms that basic identifying details have been sighted by the committee. It is not a warranty of the company's claims, financials, performance, or compliance — and should not be read as due-diligence or endorsement.",
  },
  {
    q: "How long does review take?",
    a: "Roughly two weeks. We review submissions in batches each fortnight. You'll get an email when the committee decides — approved, requested edits, or declined with reasoning.",
  },
  {
    q: "What's the difference between Listed and Featured tier?",
    a: "Listed means you're in the public directory and discoverable. Featured tier unlocks priority introductions to investors and corporate buyers, showcase placements, speaking opportunities, and access to private programs.",
  },
  {
    q: "Can I update my profile later?",
    a: "Yes. Approved companies get a portal to edit their profile, swap logos, update metrics, and add new founders/team members. Material changes go back through a lightweight review.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative bg-white py-20 sm:py-28">
      <div className="site-container">
        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <Kicker>Questions, answered</Kicker>
              <h2 className="mt-4 font-serif text-3xl sm:text-5xl font-extrabold tracking-tight text-pasha-ink text-balance">
                Everything you need to know.
              </h2>
              <p className="mt-4 text-pasha-muted leading-relaxed max-w-sm">
                Can&apos;t find what you&apos;re looking for?{" "}
                <a href="mailto:startups@pasha.org.pk" className="text-pasha-red hover:underline underline-offset-2">
                  Email us
                </a>
                .
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
