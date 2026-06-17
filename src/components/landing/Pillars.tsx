"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { Network, Compass, Trophy, Users, Lightbulb, ShieldCheck } from "lucide-react";
import { useRef } from "react";

const PILLARS = [
  {
    icon: Network,
    title: "Curated network",
    body:
      "Access founders, investors, and ecosystem leaders. Not a noisy list — a vetted graph of who's building what across Pakistan.",
  },
  {
    icon: Compass,
    title: "Mentorship & training",
    body:
      "Programs, sessions, and founder enablement organized by stage and sector. Hands-on, not just panels.",
  },
  {
    icon: Trophy,
    title: "Competitions & funding",
    body:
      "Exclusive access to grants, pitch competitions, and global opportunities through P@SHA's ecosystem partnerships.",
  },
  {
    icon: Users,
    title: "Community connect",
    body:
      "WhatsApp + Facebook communities for daily peer support. Get help on hiring, GTM, and capital from people who've been there.",
  },
  {
    icon: Lightbulb,
    title: "Directory visibility",
    body:
      "Be listed in P@SHA's public directory for investors, government partners, and corporate buyers actively looking for Pakistani product companies.",
  },
  {
    icon: ShieldCheck,
    title: "Vetted standards",
    body:
      "Every entry is reviewed against a public rubric. Featured tier startups get priority introductions and showcases.",
  },
];

export function Pillars() {
  return (
    <section className="relative border-y border-pasha-line bg-pasha-stone/40 overflow-hidden">
      {/* Subtle moving background accent */}
      <motion.div
        aria-hidden
        className="absolute top-1/2 -translate-y-1/2 left-0 w-[400px] h-[400px] rounded-full bg-pasha-red/[0.04] blur-3xl animate-float-slow"
      />
      <motion.div
        aria-hidden
        className="absolute top-1/3 right-0 w-[300px] h-[300px] rounded-full bg-pasha-red-light/[0.05] blur-3xl animate-float-slower"
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 py-20 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <span className="font-mono text-[11px] uppercase tracking-[3px] text-pasha-red">
            What you get
          </span>
          <h2 className="mt-3 font-serif text-3xl  sm:text-4xl lg:text-5xl tracking-tight text-pasha-ink text-balance">
            Built to compound, not just to host.
          </h2>
          <p className="mt-4 text-pasha-muted text-lg leading-relaxed max-w-xl text-pretty">
            Most directories are dead lists. PSEC is an active program with
            structured engagement, vetting, and accountability.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-pasha-line border border-pasha-line rounded-2xl overflow-hidden">
          {PILLARS.map((p, i) => (
            <PillarCard key={p.title} pillar={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PillarCard({
  pillar,
  index,
}: {
  pillar: (typeof PILLARS)[number];
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spotlight that follows the cursor across the card
  const spotlight = useTransform(
    [mouseX, mouseY],
    ([x, y]) =>
      `radial-gradient(280px circle at ${x}px ${y}px, rgba(230, 22, 15, 0.08), transparent 70%)`
  );

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={onMouseMove}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.55,
        delay: index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group relative bg-white p-7 flex flex-col gap-3 overflow-hidden"
    >
      {/* Cursor spotlight */}
      <motion.div
        aria-hidden
        style={{ background: spotlight }}
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />

      {/* Top accent bar that slides in on hover */}
      <span
        aria-hidden
        className="absolute top-0 left-0 h-[2px] w-0 bg-gradient-to-r from-pasha-red to-pasha-red-light group-hover:w-full transition-all duration-500 ease-out"
      />

      <div className="relative">
        {/* Icon with hover scale + rotate + glow */}
        <div className="relative inline-flex">
          <span
            aria-hidden
            className="absolute inset-0 -m-2 rounded-xl bg-pasha-red/10 scale-0 group-hover:scale-100 transition-transform duration-300"
          />
          <pillar.icon
            className="relative w-7 h-7 text-pasha-red transition-all duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]"
            strokeWidth={1.5}
          />
        </div>
        <h3 className="text-lg font-semibold text-pasha-ink mt-3 group-hover:text-pasha-red transition-colors duration-200">
          {pillar.title}
        </h3>
        <p className="mt-2 text-sm text-pasha-muted leading-relaxed text-pretty">
          {pillar.body}
        </p>
      </div>
    </motion.div>
  );
}
