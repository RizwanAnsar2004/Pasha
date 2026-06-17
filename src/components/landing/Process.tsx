"use client";

import { motion } from "framer-motion";
import { FileText, Search, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

const EASE = [0.22, 1, 0.36, 1] as const;

const STEPS = [
  {
    num: "01",
    icon: FileText,
    title: "Apply in 8 minutes",
    body:
      "Fill the 3-step form. Tell us about your startup, founders, traction, and product. Upload your deck and logos.",
    duration: "~8 min",
  },
  {
    num: "02",
    icon: Search,
    title: "Committee review",
    body:
      "P@SHA's vetting committee reviews submissions against a public rubric — product-native, verifiable founders, real traction.",
    duration: "~2 weeks",
  },
  {
    num: "03",
    icon: Sparkles,
    title: "Get featured & connected",
    body:
      "Approved startups appear in the public directory. Featured tier unlocks priority intros, showcases, and funding access.",
    duration: "Ongoing",
  },
];

export function Process() {
  return (
    <section className="relative bg-pasha-stone/30 border-y border-pasha-line py-20 sm:py-28 overflow-hidden">
      {/* Background flourish */}
      <motion.div
        aria-hidden
        className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-pasha-red/[0.04] via-pasha-red-light/[0.06] to-pasha-red/[0.04] blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="max-w-2xl mb-16"
        >
          <span className="inline-flex items-center rounded-full bg-pasha-red/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-pasha-red">
            How it works
          </span>
          <h2 className="mt-3 font-serif leading-[52px] text-3xl sm:text-4xl lg:text-5xl tracking-tight text-pasha-ink text-balance">
            From application to featured — in three steps.
          </h2>
        </motion.div>

        {/* Timeline */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10">
          {/* Connecting line (desktop only) */}
          <div
            aria-hidden
            className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-pasha-line via-pasha-red/30 to-pasha-line"
          />

          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: EASE }}
              className="relative group"
            >
              {/* Step circle with icon */}
              <div className="relative flex items-center justify-center mb-6">
                <div className="relative w-24 h-24 rounded-full bg-white border-2 border-pasha-line group-hover:border-pasha-red transition-all duration-500 grid place-items-center shadow-sm group-hover:shadow-lg">
                  {/* Pulsing ring */}
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-pasha-red/10 scale-0 group-hover:scale-110 transition-transform duration-500"
                  />
                  <step.icon
                    className="relative w-9 h-9 text-pasha-red transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                    strokeWidth={1.5}
                  />
                  {/* Step number badge */}
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-pasha-ink text-white font-mono text-[11px] font-bold grid place-items-center shadow-md">
                    {step.num}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="text-center px-2">
                <h3 className="font-serif text-xl text-pasha-ink leading-tight">
                  {step.title}
                </h3>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-pasha-red/[0.07] px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-pasha-red animate-pulse-soft" />
                  <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-pasha-red font-semibold">
                    {step.duration}
                  </span>
                </div>
                <p className="mt-4 text-sm text-pasha-muted leading-relaxed text-pretty max-w-xs mx-auto">
                  {step.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <Link
            href="/apply"
            className="group inline-flex items-center gap-2 rounded-full bg-pasha-ink px-6 py-3 text-sm font-medium text-white hover:bg-pasha-red transition-colors"
          >
            Start your application
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
