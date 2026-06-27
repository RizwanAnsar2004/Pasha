"use client";

import { motion } from "framer-motion";
import { Calendar, MapPin, Sparkles, Users } from "lucide-react";
import Link from "next/link";

const EASE = [0.22, 1, 0.36, 1] as const;

const FLOATING_TAGS = [
  { label: "Webinar", delay: 0 },
  { label: "Seminar", delay: 0.08 },
  { label: "Summit", delay: 0.16 },
  { label: "Workshop", delay: 0.24 },
  { label: "Networking", delay: 0.32 },
];

export function EventsHero({ totalEvents }: { totalEvents: number }) {
  return (
    <section className="relative bg-pasha-stone border-b border-pasha-line overflow-hidden">
      {/* Ambient */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-dots opacity-50" />
        <div className="absolute -top-32 left-1/4 w-[560px] h-[560px] rounded-full bg-pasha-red/[0.05] blur-[150px] animate-float-slow" />
        <div className="absolute -bottom-20 right-1/4 w-[480px] h-[480px] rounded-full bg-pasha-red/[0.04] blur-[130px] animate-float-slower" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 py-18 sm:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: EASE }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pasha-red/10 ring-1 ring-inset ring-pasha-red/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-pasha-red">
                <Sparkles className="w-3 h-3" />
                Community Events
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
              className="mt-5 font-serif text-4xl sm:text-5xl lg:text-[3.5rem] tracking-tight text-pasha-ink text-balance leading-[1.1]"
            >
              Where Pakistan&apos;s{" "}
              <span className="text-pasha-red">Ecosystem</span>{" "}
              Connects
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16, ease: EASE }}
              className="mt-5 text-base sm:text-lg text-pasha-muted leading-relaxed max-w-lg"
            >
              Webinars, seminars, and gatherings for founders, investors, and
              ecosystem enablers across Pakistan — curated by P@SHA.
            </motion.p>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24, ease: EASE }}
              className="mt-8 flex items-center gap-6 flex-wrap"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pasha-red/10 border border-pasha-red/15 grid place-items-center">
                  <Calendar className="w-4 h-4 text-pasha-red" />
                </div>
                <div>
                  <p className="text-xl font-serif text-pasha-ink leading-none">{totalEvents}</p>
                  <p className="text-[11px] text-pasha-muted uppercase tracking-[1px] mt-0.5">Events</p>
                </div>
              </div>
              <div className="h-8 w-px bg-pasha-line" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pasha-ink/[0.05] border border-pasha-line grid place-items-center">
                  <Users className="w-4 h-4 text-pasha-muted" />
                </div>
                <div>
                  <p className="text-xl font-serif text-pasha-ink leading-none">5,000+</p>
                  <p className="text-[11px] text-pasha-muted uppercase tracking-[1px] mt-0.5">Attendees</p>
                </div>
              </div>
              <div className="h-8 w-px bg-pasha-line" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pasha-ink/[0.05] border border-pasha-line grid place-items-center">
                  <MapPin className="w-4 h-4 text-pasha-muted" />
                </div>
                <div>
                  <p className="text-xl font-serif text-pasha-ink leading-none">10+</p>
                  <p className="text-[11px] text-pasha-muted uppercase tracking-[1px] mt-0.5">Cities</p>
                </div>
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.32, ease: EASE }}
              className="mt-8 flex items-center gap-3 flex-wrap"
            >
              <Link
                href="/apply"
                className="group inline-flex items-center gap-2 rounded-full bg-pasha-red px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-pasha-red/20 hover:bg-pasha-red-dark hover:scale-105 hover:shadow-pasha-red/30 hover:shadow-md transition-all duration-300"
              >
                Host an Event with P@SHA
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href="#events"
                className="inline-flex items-center gap-2 rounded-full border border-pasha-line bg-white/80 px-6 py-3 text-sm font-medium text-pasha-ink hover:border-pasha-ink/30 hover:bg-white transition-all duration-200"
              >
                Browse Events
              </Link>
            </motion.div>
          </div>

          {/* Right — floating tag orbit */}
          <div className="relative hidden lg:flex items-center justify-center h-72">
            {/* Outer decorative rings */}
            <div className="absolute w-64 h-64 rounded-full border border-pasha-line/60" />
            <div className="absolute w-48 h-48 rounded-full border border-pasha-line/40" />

            {/* Central calendar badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.65, delay: 0.2, ease: EASE }}
              className="relative z-10 w-28 h-28 rounded-2xl bg-white border border-pasha-line shadow-[0_8px_32px_rgba(14,14,16,0.10)] grid place-items-center flex-col"
            >
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-lg bg-pasha-red/10 grid place-items-center mb-1.5">
                  <Calendar className="w-4 h-4 text-pasha-red" />
                </div>
                <p className="font-serif text-2xl text-pasha-ink leading-none">{totalEvents}</p>
                <p className="text-[9px] font-mono uppercase tracking-[1.5px] text-pasha-muted mt-0.5">Events</p>
              </div>
            </motion.div>

            {/* Orbiting type pills */}
            {FLOATING_TAGS.map((tag, i) => {
              const angle = (i / FLOATING_TAGS.length) * 360 - 90;
              const rad = (angle * Math.PI) / 180;
              const r = 128;
              const x = Math.cos(rad) * r;
              const y = Math.sin(rad) * r;
              return (
                <motion.div
                  key={tag.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.35 + tag.delay, ease: EASE }}
                  style={{
                    position: "absolute",
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: "translate(-50%, -50%)",
                  }}
                  className="inline-flex items-center rounded-full border border-pasha-line bg-white shadow-sm px-3.5 py-1.5 text-xs font-semibold text-pasha-ink/70 whitespace-nowrap hover:border-pasha-red/30 hover:text-pasha-red hover:shadow-md transition-all duration-300 cursor-default"
                >
                  {tag.label}
                </motion.div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}
