"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Sparkles, Clock, Save } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

export function ApplyHero() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 18 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 18 });
  const blob1X = useTransform(springX, [-1, 1], [-25, 25]);
  const blob1Y = useTransform(springY, [-1, 1], [-25, 25]);
  const blob2X = useTransform(springX, [-1, 1], [20, -20]);
  const blob2Y = useTransform(springY, [-1, 1], [20, -20]);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    mouseX.set(((e.clientX - left) / width) * 2 - 1);
    mouseY.set(((e.clientY - top) / height) * 2 - 1);
  }

  return (
    <section
      onMouseMove={onMouseMove}
      className="relative overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #FAF8F4 0%, #FFFFFF 100%)",
      }}
    >
      {/* Warm orbs */}
      <motion.div
        style={{ x: blob1X, y: blob1Y }}
        aria-hidden
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] animate-float-slow bg-gradient-to-br from-orange-200/50 via-rose-200/40 to-amber-100/30"
      />
      <motion.div
        style={{ x: blob2X, y: blob2Y }}
        aria-hidden
        className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full blur-[120px] animate-float-slower bg-gradient-to-br from-pasha-red/15 via-rose-200/40 to-orange-200/30"
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(14, 14, 16, 0.06) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-8 pt-6 sm:pt-8 lg:pt-10 pb-14">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm border border-pasha-line shadow-sm px-3 py-1.5"
        >
          <Sparkles className="w-3 h-3 text-pasha-red" />
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-ink/80">
            Apply to be indexed
          </span>
        </motion.div>

        {/* Editorial headline */}
        <h1 className="mt-6 font-serif text-[30px] sm:text-[56px] lg:text-[68px] leading-[0.96] tracking-tight text-pasha-ink text-balance">
          <motion.span
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
            className="block"
          >
            Tell us about
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
            className="block relative"
          >
            your{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-pasha-red via-pasha-red-light to-orange-500 bg-clip-text text-transparent animate-gradient-shift">
                startup
              </span>
              <motion.svg
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.1, delay: 0.9, ease: EASE }}
                className="absolute -bottom-1 sm:-bottom-2 left-0 w-full h-2.5"
                viewBox="0 0 300 12"
                fill="none"
                preserveAspectRatio="none"
              >
                <motion.path
                  d="M2 8 Q 60 2, 120 6 T 240 5 T 298 7"
                  stroke="url(#applyUnderline)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
                <defs>
                  <linearGradient id="applyUnderline" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#E6160F" />
                    <stop offset="100%" stopColor="#FF8A30" />
                  </linearGradient>
                </defs>
              </motion.svg>
            </span>
            .
          </motion.span>
        </h1>

        {/* Lede + signals */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="mt-8 text-lg text-pasha-muted max-w-2xl leading-relaxed text-pretty"
        >
          Three quick steps. Auto-saves as you go. No fee, no equity — just a
          clean form that gets your startup onto Pakistan&apos;s product index.
        </motion.p>

        {/* Trust strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.85 }}
          className="mt-8 flex flex-wrap items-center gap-4 sm:gap-6"
        >
          <TrustBadge icon={Clock} text="~8 minutes" />
          <Dot />
          <TrustBadge icon={Save} text="Auto-saved as you type" />
          <Dot />
          <TrustBadge icon={Sparkles} text="Reviewed in 2 weeks" />
        </motion.div>
      </div>
    </section>
  );
}

function TrustBadge({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-pasha-ink/70">
      <Icon className="w-3.5 h-3.5 text-pasha-red" />
      <span className="font-mono text-[11px] uppercase tracking-[1.5px]">{text}</span>
    </span>
  );
}

function Dot() {
  return <span aria-hidden className="hidden sm:block w-1 h-1 rounded-full bg-pasha-ink/20" />;
}
