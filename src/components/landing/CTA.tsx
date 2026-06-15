"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useRef } from "react";

export function CTA() {
  // Magnetic button — button shifts slightly toward the cursor as it nears.
  const btnX = useMotionValue(0);
  const btnY = useMotionValue(0);
  const springX = useSpring(btnX, { stiffness: 200, damping: 15 });
  const springY = useSpring(btnY, { stiffness: 200, damping: 15 });
  const btnRef = useRef<HTMLAnchorElement>(null);

  function handleMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    btnX.set((e.clientX - cx) * 0.25);
    btnY.set((e.clientY - cy) * 0.25);
  }
  function handleLeave() {
    btnX.set(0);
    btnY.set(0);
  }

  // Parallax for background orbs based on cursor in the section
  const sectionMx = useMotionValue(0);
  const sectionMy = useMotionValue(0);
  const sxSpring = useSpring(sectionMx, { stiffness: 50, damping: 20 });
  const sySpring = useSpring(sectionMy, { stiffness: 50, damping: 20 });
  const orbBigX = useTransform(sxSpring, [-1, 1], [-30, 30]);
  const orbBigY = useTransform(sySpring, [-1, 1], [-20, 20]);

  function sectionMove(e: React.MouseEvent<HTMLDivElement>) {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    sectionMx.set(((e.clientX - left) / width) * 2 - 1);
    sectionMy.set(((e.clientY - top) / height) * 2 - 1);
  }

  return (
    <section
      onMouseMove={sectionMove}
      className="relative overflow-hidden bg-pasha-ink text-white"
    >
      {/* Background orbs */}
      <div className="absolute inset-0">
        <motion.div
          style={{ x: orbBigX, y: orbBigY }}
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-pasha-red/30 blur-3xl animate-float-slow"
        />
        <motion.div
          style={{ x: useTransform(sxSpring, [-1, 1], [20, -20]) }}
          className="absolute -bottom-40 right-0 w-[400px] h-[400px] rounded-full bg-pasha-red-light/15 blur-3xl animate-float-slower"
        />
        <div className="absolute inset-0 bg-grid opacity-[0.04]" />
        {/* Subtle starfield dots */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 sm:px-8 py-24 sm:py-32 text-center">
        {/* Eyebrow chip */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] backdrop-blur-sm px-3 py-1.5 mb-6"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-pasha-red-light opacity-75 animate-pulse-soft" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-pasha-red-light" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[2.5px] text-white/80">
            Applications open
          </span>
          <Sparkles className="w-3 h-3 text-pasha-red-light" />
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="font-serif text-4xl sm:text-5xl lg:text-6xl tracking-tight text-balance"
        >
          Ready to make Pakistan&apos;s product economy{" "}
          <span className="bg-gradient-to-r from-pasha-red-light via-orange-300 to-pasha-red-light bg-clip-text text-transparent animate-gradient-shift">
            visible
          </span>
          ?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-lg text-white/70 max-w-2xl mx-auto leading-relaxed text-pretty"
        >
          Takes about 8 minutes. Review by the committee within two weeks.
          Featured tier startups get priority introductions and showcases.
        </motion.p>

        {/* Magnetic CTA button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-10 inline-block"
        >
          <motion.a
            ref={btnRef}
            href="/apply"
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            style={{ x: springX, y: springY }}
            className="group relative inline-flex items-center gap-2 rounded-full bg-pasha-red px-8 py-4 text-base font-medium text-white shadow-xl shadow-pasha-red/30 hover:bg-pasha-red-dark transition-colors animate-glow-ring overflow-hidden"
          >
            {/* Shine sweep */}
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:translate-x-full transition-transform duration-700"
            />
            <span className="relative">Start your application</span>
            <ArrowRight className="relative w-4 h-4 transition-transform group-hover:translate-x-1.5" />
          </motion.a>
        </motion.div>

        {/* Micro trust line */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-6 text-[12px] font-mono uppercase tracking-[2px] text-white/40"
        >
          No fee · No equity · Just visibility
        </motion.p>
      </div>

      {/* Wrap the Link as the actual anchor — keep Next prefetch working */}
      <Link href="/apply" className="sr-only">
        Apply
      </Link>
    </section>
  );
}
