"use client";

import { motion } from "framer-motion";

// Incubators / ecosystem partners in Pakistan's startup scene.
const PARTNERS = [
  { name: "Ignite", short: "IG" },
  { name: "NUST NIC", short: "NIC" },
  { name: "LUMS CE", short: "LCE" },
  { name: "Plan9", short: "P9" },
  { name: "IBA AMAN CED", short: "IBA" },
  { name: "Bilal Khan Tech Fund", short: "BKT" },
  { name: "Karandaaz", short: "KZ" },
  { name: "i2i Ventures", short: "i2i" },
  { name: "Indus Valley Capital", short: "IVC" },
  { name: "Sarmayacar", short: "SC" },
];

export function TrustStrip() {
  // Duplicate the list so the marquee can loop seamlessly.
  const loop = [...PARTNERS, ...PARTNERS];

  return (
    <section className="relative bg-white border-y border-pasha-line/70 py-12 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <span className="font-mono text-[10px] uppercase tracking-[3px] text-pasha-muted">
          Trusted by Pakistan&apos;s leading incubators &amp; ecosystem partners
        </span>
      </motion.div>

      {/* Marquee strip */}
      <div className="relative">
        {/* Fade edges */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-white to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-white to-transparent"
        />

        <div className="flex animate-marquee gap-12 w-fit">
          {loop.map((p, i) => (
            <div
              key={`${p.name}-${i}`}
              className="group flex items-center gap-3 shrink-0 opacity-50 hover:opacity-100 transition-opacity duration-300"
            >
              <div className="w-10 h-10 rounded-lg border border-pasha-line bg-pasha-stone/40 grid place-items-center text-[10px] font-mono font-bold text-pasha-ink/70 group-hover:bg-pasha-red group-hover:text-white group-hover:border-pasha-red transition-colors">
                {p.short}
              </div>
              <span className="text-sm font-medium text-pasha-ink/70 group-hover:text-pasha-ink transition-colors">
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
