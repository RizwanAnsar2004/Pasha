"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const YES = [
  "Product-based startups (SaaS, marketplaces, apps, platforms)",
  "Founders building scalable, IP-owning solutions",
  "FinTech, AI, AgriTech, SaaS, HealthTech, EdTech, ClimateTech, Gaming",
  "Pre-seed through Series A and beyond",
  "Bootstrapped product companies with traction",
  "Pakistan-founded or Pakistan-headquartered companies",
];

const NO = [
  "Services agencies (custom dev, staff augmentation, IT consulting)",
  "Companies with no working product",
  "Submissions without verifiable founder identity",
  "Shut-down or distressed companies",
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function Criteria() {
  return (
    <section className="relative border-b border-pasha-line bg-white overflow-hidden">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-20 sm:py-28">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="max-w-2xl"
        >
          <span className="inline-flex items-center rounded-full bg-pasha-red/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-pasha-red">
            Who should apply
          </span>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl tracking-tight text-pasha-ink text-balance">
            Product-native. Vetted. Real.
          </h2>
        </motion.div>

        <div className="mt-14 grid md:grid-cols-2 gap-6 lg:gap-10">
          {/* YES card — slides in from left */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: EASE }}
            whileHover={{ y: -4 }}
            className="group relative rounded-2xl border border-pasha-line bg-white p-8 hover:border-tier-featured/30 hover:shadow-xl hover:shadow-tier-featured/[0.06] transition-all duration-300 overflow-hidden"
          >
            {/* Top accent bar */}
            <span
              aria-hidden
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-tier-featured to-emerald-400 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
            />
            <div className="flex items-center gap-3 mb-6">
              <div className="relative w-10 h-10 rounded-full bg-tier-featured/10 grid place-items-center">
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-tier-featured/20 animate-ping opacity-0 group-hover:opacity-100"
                />
                <Check
                  className="relative w-5 h-5 text-tier-featured transition-transform group-hover:scale-110"
                  strokeWidth={2}
                />
              </div>
              <h3 className="text-lg font-semibold text-pasha-ink">Apply if you are</h3>
            </div>
            <ul className="space-y-3">
              {YES.map((line, i) => (
                <motion.li
                  key={line}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.06, ease: EASE }}
                  className="flex items-start gap-3 text-sm text-pasha-ink leading-relaxed hover:translate-x-0.5 transition-transform"
                >
                  <Check
                    className="w-4 h-4 text-tier-featured mt-0.5 shrink-0"
                    strokeWidth={2.25}
                  />
                  <span>{line}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* NO card — slides in from right */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            whileHover={{ y: -4 }}
            className="group relative rounded-2xl border border-pasha-line bg-pasha-stone/30 p-8 hover:bg-pasha-stone/50 hover:border-pasha-muted/30 transition-all duration-300 overflow-hidden"
          >
            <span
              aria-hidden
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pasha-muted/40 to-pasha-muted/20 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
            />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-pasha-muted/15 grid place-items-center transition-transform group-hover:rotate-90 duration-500">
                <X className="w-5 h-5 text-pasha-muted" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-semibold text-pasha-ink">
                Not for this directory
              </h3>
            </div>
            <ul className="space-y-3">
              {NO.map((line, i) => (
                <motion.li
                  key={line}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.06, ease: EASE }}
                  className="flex items-start gap-3 text-sm text-pasha-muted leading-relaxed"
                >
                  <X
                    className="w-4 h-4 text-pasha-muted mt-0.5 shrink-0"
                    strokeWidth={2.25}
                  />
                  <span>{line}</span>
                </motion.li>
              ))}
            </ul>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="mt-6 text-xs text-pasha-muted leading-relaxed"
            >
              Services companies are still welcome at P@SHA — but this committee
              focuses on the product-native subset. Other P@SHA committees
              handle services-led work.
            </motion.p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
