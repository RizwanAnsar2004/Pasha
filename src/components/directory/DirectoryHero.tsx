"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useInView,
  animate,
} from "framer-motion";
import { Sparkles, Database, BadgeCheck, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

export function DirectoryHero({
  totalStartups,
  sectorCount,
}: {
  totalStartups: number;
  sectorCount: number;
}) {
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

      {/* Dot grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(14, 14, 16, 0.06) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 pt-6 sm:pt-8 lg:pt-10 pb-16 lg:pb-20">
        {/* Two-column layout: copy on left, stat cards on right */}
        <div className="mt-10 grid lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-16 items-end">
          {/* LEFT — eyebrow + headline + lede */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm border border-pasha-line shadow-sm px-3 py-1.5"
            >
              <Sparkles className="w-3 h-3 text-pasha-red" />
              <span className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-ink/80">
                The live startup index
              </span>
            </motion.div>

            <h1 className="mt-6 font-serif text-[40px] sm:text-[56px] lg:text-[68px] leading-[0.96] tracking-tight text-pasha-ink text-balance">
              <motion.span
                initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
                className="block"
              >
                Pakistan&apos;s product
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
                className="block relative"
              >
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-pasha-red via-pasha-red-light to-orange-500 bg-clip-text text-transparent animate-gradient-shift">
                    economy
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
                      stroke="url(#dirUnderline)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <defs>
                      <linearGradient id="dirUnderline" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#E6160F" />
                        <stop offset="100%" stopColor="#FF8A30" />
                      </linearGradient>
                    </defs>
                  </motion.svg>
                </span>
                ,{" "}
                <span className="italic font-light text-pasha-muted">indexed.</span>
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65 }}
              className="mt-7 text-base sm:text-lg text-pasha-muted leading-relaxed text-pretty max-w-xl"
            >
              Seeded from Ignite&apos;s StartupConnect, the P@SHA ICT Awards,
              and incubator networks across the country. Vetted entries earn
              the Featured tier.
            </motion.p>
          </div>

          {/* RIGHT — three stat tiles */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="grid grid-cols-3 gap-3"
          >
            <StatTile
              icon={Database}
              value={totalStartups}
              label="Indexed"
              accent="from-pasha-red/10 to-pasha-red-light/5"
            />
            <StatTile
              icon={MapPin}
              value={sectorCount}
              label="Sectors"
              accent="from-blue-100/40 to-cyan-100/30"
            />
            <StatTile
              icon={BadgeCheck}
              value={5}
              suffix="+"
              label="Verified"
              accent="from-amber-100/40 to-orange-100/30"
              highlight
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */
function StatTile({
  icon: Icon,
  value,
  label,
  accent,
  suffix = "",
  highlight = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  accent: string;
  suffix?: string;
  highlight?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.5,
      ease: EASE,
      onUpdate: (v) => setDisplay(Math.round(v).toLocaleString()),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <div
      ref={ref}
      className={`relative rounded-2xl border ${
        highlight ? "border-pasha-red/25" : "border-pasha-line"
      } bg-white p-4 lg:p-5 overflow-hidden`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-50`} />
      {highlight && (
        <span className="absolute top-2 right-2 inline-flex w-1.5 h-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-pasha-red opacity-75 animate-pulse-soft" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-pasha-red" />
        </span>
      )}
      <div className="relative">
        <Icon
          className={`w-4 h-4 ${highlight ? "text-pasha-red" : "text-pasha-ink/60"} mb-3`}
        />
        <div className="font-serif text-2xl lg:text-3xl font-semibold text-pasha-ink leading-none tabular-nums">
          {display}
          {suffix}
        </div>
        <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[1.5px] text-pasha-muted">
          {label}
        </div>
      </div>
    </div>
  );
}
