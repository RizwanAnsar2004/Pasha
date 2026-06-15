"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, HelpCircle } from "lucide-react";
import { useState } from "react";

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
    <section className="relative bg-white border-b border-pasha-line py-20 sm:py-28 overflow-hidden">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-pasha-line bg-pasha-stone/40 px-3 py-1.5 mb-5">
            <HelpCircle className="w-3.5 h-3.5 text-pasha-red" />
            <span className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-ink/80">
              Frequently asked
            </span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl tracking-tight text-pasha-ink text-balance">
            Questions, answered.
          </h2>
          <p className="mt-4 text-pasha-muted leading-relaxed">
            Can&apos;t find what you&apos;re looking for?{" "}
            <a
              href="mailto:hello@pasha.org.pk"
              className="text-pasha-red hover:underline underline-offset-2"
            >
              Email us
            </a>
            .
          </p>
        </motion.div>

        {/* Accordion */}
        <div className="space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.05, ease: EASE }}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? "border-pasha-ink/20 bg-white shadow-md"
                    : "border-pasha-line bg-white hover:border-pasha-ink/15 hover:bg-pasha-stone/30"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full text-left flex items-center justify-between gap-4 px-6 py-5"
                  aria-expanded={isOpen}
                >
                  <span
                    className={`text-base font-medium transition-colors ${
                      isOpen ? "text-pasha-ink" : "text-pasha-ink/85"
                    }`}
                  >
                    {faq.q}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className={`shrink-0 w-8 h-8 rounded-full grid place-items-center transition-colors ${
                      isOpen
                        ? "bg-pasha-red text-white"
                        : "bg-pasha-stone text-pasha-ink/70 group-hover:bg-pasha-line"
                    }`}
                  >
                    <Plus className="w-4 h-4" strokeWidth={2} />
                  </motion.div>
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
                      <div className="px-6 pb-6 pt-1 text-pasha-muted leading-relaxed text-pretty">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
