"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Handshake } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

export function CommitteeBanner() {
  return (
    <section className="relative bg-white border-b border-pasha-line py-16 sm:py-20 overflow-hidden">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="relative rounded-3xl bg-pasha-ink overflow-hidden px-6 sm:px-10 lg:px-14 py-12 sm:py-14 flex flex-col lg:flex-row items-center justify-between gap-8"
        >
          <div
            aria-hidden
            className="absolute -top-24 -right-24 w-[400px] h-[400px] rounded-full bg-pasha-red/25 blur-[100px]"
          />
          <div
            aria-hidden
            className="absolute -bottom-24 -left-24 w-[300px] h-[300px] rounded-full bg-pasha-red-light/15 blur-[100px]"
          />

          <div className="relative max-w-xl text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] backdrop-blur-sm px-3 py-1.5">
              <Handshake className="w-3 h-3 text-pasha-red-light" />
              <span className="font-mono text-[10px] uppercase tracking-[2px] text-white/80">
                P@SHA Committee
              </span>
            </span>
            <h2 className="mt-4 font-serif text-2xl sm:text-3xl lg:text-4xl tracking-tight text-white text-balance">
              Meet the people building Pakistan&apos;s startup ecosystem
            </h2>
            <p className="mt-3 text-white/70 leading-relaxed text-pretty">
              Founders, investors, and government leaders driving policy,
              verification, and growth — under the P@SHA Startups &amp;
              Entrepreneurship Committee.
            </p>
          </div>

          <Link
            href="/committee"
            className="relative group shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-medium text-pasha-ink shadow-xl hover:bg-pasha-red hover:text-white transition-all hover:-translate-y-0.5"
          >
            Meet the Committee
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
