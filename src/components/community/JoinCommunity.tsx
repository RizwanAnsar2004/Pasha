"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, MessagesSquare } from "lucide-react";
import { PASHA_FACEBOOK } from "@/lib/content/community";
import { FacebookGlyph } from "./FacebookGlyph";

const EASE = [0.22, 1, 0.36, 1] as const;

// Dark glass CTA band linking to the P@SHA Facebook community.
export function JoinCommunity() {
  return (
    <section className="relative overflow-hidden bg-pasha-ink py-16 sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] bg-[linear-gradient(rgba(255,255,255,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.3)_1px,transparent_1px)] bg-[size:64px_64px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -bottom-56 h-[560px] w-[560px] rounded-full bg-pasha-red/[0.22] blur-[90px]"
      />

      <div className="relative site-container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7 sm:p-10 transition-colors duration-300 hover:border-white/20"
        >
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                <MessagesSquare className="h-3.5 w-3.5 text-pasha-red-light" />
                <span className="font-mono text-[10px] uppercase tracking-[2px] text-white/55">
                  Community
                </span>
              </span>

              <h2 className="mt-4 font-serif text-2xl sm:text-4xl font-bold leading-tight tracking-tight text-white text-balance">
                Join the founder{" "}
                <span className="text-pasha-red-light">community.</span>
              </h2>

              <p className="mt-3 max-w-xl text-sm sm:text-base leading-relaxed text-white/55 text-pretty">
                Follow P@SHA on Facebook for ecosystem news, event invites, funding
                and competition calls, and day-to-day peer support from founders
                building across Pakistan.
              </p>
            </div>

            <a
              href={PASHA_FACEBOOK}
              target="_blank"
              rel="noreferrer noopener"
              className="group/cta inline-flex shrink-0 items-center justify-center gap-2.5 rounded-[20px] bg-pasha-red px-7 py-4 text-sm font-semibold text-white transition-all duration-300 hover:bg-pasha-red-dark hover:scale-[1.03] hover:shadow-lg hover:shadow-pasha-red/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pasha-red-light focus-visible:ring-offset-2 focus-visible:ring-offset-pasha-ink"
            >
              <FacebookGlyph className="h-4 w-4" />
              Join on Facebook
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
