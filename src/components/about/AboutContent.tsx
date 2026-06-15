"use client";

import Link from "next/link";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Sparkles,
  Compass,
  ShieldCheck,
  Network,
  Mail,
  Users,
} from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const SECTIONS = [
  {
    num: "01",
    icon: BookOpen,
    title: "What this directory is",
    body: "A curated, vetted registry of Pakistani startups, their founders, and the investors and partners who back them. Not a noisy list — a public standard for what Pakistan's startup economy looks like.",
  },
  {
    num: "02",
    icon: Users,
    title: "Who's eligible",
    body: "Startups across sectors — FinTech, AI, AgriTech, SaaS, HealthTech, EdTech, ClimateTech, Gaming, and more. Founders building scalable solutions with verifiable IP. Services-led companies have their own home at other P@SHA committees.",
  },
  {
    num: "03",
    icon: ShieldCheck,
    title: "How vetting works",
    body: "Five hard gates (identity, contact, working URL, founder name, description) plus ten scoring dimensions across product maturity, traction, team strength, market attractiveness, international readiness, revenue clarity, ecosystem contribution, defensibility, acquisition repeatability, and strategic fit. Total 0–50. Tiers: Featured (≥35) · Listed (25–34) · Watchlist (15–24).",
  },
  {
    num: "04",
    icon: Network,
    title: "What you get",
    body: "Access to a curated founder network · mentorship and training programs · participation in exclusive partnerships · funding and competition referrals · directory visibility for investors and government delegations · WhatsApp + Facebook community channels for daily peer support.",
  },
  {
    num: "05",
    icon: Mail,
    title: "Contact",
    body: "startups@pasha.org.pk",
    isContact: true,
  },
];

export function AboutContent() {
  // Hero mouse parallax
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
    <>
      {/* ──────────────────────────────────────────────────────
          HERO — magazine-style header matching the home page
          ────────────────────────────────────────────────────── */}
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

        <div className="relative mx-auto max-w-4xl px-5 sm:px-8 pt-6 sm:pt-8 lg:pt-10 pb-16 lg:pb-20">
          {/* Eyebrow chip */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm border border-pasha-line shadow-sm px-3 py-1.5"
          >
            <Sparkles className="w-3 h-3 text-pasha-red" />
            <span className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-ink/80">
              About the directory
            </span>
          </motion.div>

          {/* Editorial headline */}
          <h1 className="mt-6 font-serif text-[40px] sm:text-[56px] lg:text-[68px] leading-[0.96] tracking-tight text-pasha-ink text-balance">
            <motion.span
              initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
              className="block"
            >
              P@SHA Startup
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
              className="block relative"
            >
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-pasha-red via-pasha-red-light to-orange-500 bg-clip-text text-transparent animate-gradient-shift">
                  Directory
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
                    stroke="url(#aboutUnderline)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <defs>
                    <linearGradient id="aboutUnderline" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#E6160F" />
                      <stop offset="100%" stopColor="#FF8A30" />
                    </linearGradient>
                  </defs>
                </motion.svg>
              </span>
              .
            </motion.span>
          </h1>

          {/* Lede paragraph */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="mt-8 text-lg sm:text-xl text-pasha-muted leading-relaxed text-pretty max-w-2xl"
          >
            The Pakistan Software Houses Association (P@SHA) maintains the
            country&apos;s curated directory of Pakistani startups, founders,
            investors, and ecosystem enablers.
          </motion.p>

          {/* Meta strip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.85 }}
            className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 pt-6 border-t border-pasha-ink/10"
          >
            <Meta label="Established" value="2026" />
            <Divider />
            <Meta label="Stewarded by" value="P@SHA" />
            <Divider />
            <Meta label="Committees" value="6" />
            <Divider />
            <span className="inline-flex items-center gap-2 text-pasha-muted">
              <Compass className="w-3.5 h-3.5 text-pasha-red" />
              <span className="font-mono text-[10px] uppercase tracking-[1.5px]">
                Updated daily
              </span>
            </span>
          </motion.div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
          SECTIONS — editorial article-style layout
          ────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-t border-pasha-line py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex items-center gap-3 mb-12 pb-4 border-b border-pasha-ink/10"
          >
            <span className="font-mono text-[10px] uppercase tracking-[2.5px] text-pasha-red font-semibold">
              The handbook
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[2.5px] text-pasha-ink/40">
              §1–5
            </span>
          </motion.div>

          {/* Sections list */}
          <div className="space-y-10 sm:space-y-12">
            {SECTIONS.map((section, i) => (
              <ArticleSection key={section.num} section={section} index={i} />
            ))}
          </div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mt-16 pt-10 border-t border-pasha-ink/10 flex flex-col sm:flex-row items-center gap-3"
          >
            <Link
              href="/apply"
              className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-pasha-ink px-7 py-3.5 text-base font-medium text-white shadow-xl shadow-pasha-ink/20 hover:bg-pasha-red hover:shadow-pasha-red/30 transition-all hover:-translate-y-0.5 overflow-hidden"
            >
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-700"
              />
              <span className="relative">Apply to join</span>
              <ArrowRight className="relative w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/directory"
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-pasha-ink/15 bg-white px-7 py-3.5 text-base font-medium text-pasha-ink hover:bg-pasha-stone/60 hover:border-pasha-ink/30 transition-all"
            >
              Browse the directory
              <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────
   ArticleSection — number + icon on the left, content on the right.
   ────────────────────────────────────────────────────────────── */
function ArticleSection({
  section,
  index,
}: {
  section: (typeof SECTIONS)[number];
  index: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: index * 0.05, ease: EASE }}
      className="group grid grid-cols-[auto_1fr] gap-5 sm:gap-8"
    >
      {/* Number + icon column */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-pasha-stone group-hover:bg-pasha-red/10 grid place-items-center transition-colors">
          <span
            aria-hidden
            className="absolute inset-0 rounded-2xl bg-pasha-red/0 group-hover:bg-pasha-red/5 transition-colors"
          />
          <section.icon
            className="relative w-5 h-5 sm:w-6 sm:h-6 text-pasha-ink/70 group-hover:text-pasha-red transition-colors"
            strokeWidth={1.75}
          />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-muted">
          {section.num}
        </span>
      </div>

      {/* Content */}
      <div className="min-w-0">
        <h2 className="font-serif text-2xl sm:text-3xl tracking-tight text-pasha-ink leading-tight group-hover:text-pasha-red transition-colors duration-200">
          {section.title}
        </h2>
        <div className="mt-3 text-base sm:text-[17px] text-pasha-ink/75 leading-relaxed text-pretty">
          {section.isContact ? (
            <a
              href={`mailto:${section.body}`}
              className="inline-flex items-center gap-2 text-pasha-red font-medium hover:underline underline-offset-4 decoration-2"
            >
              {section.body}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          ) : (
            section.body
          )}
        </div>
      </div>
    </motion.article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[9px] uppercase tracking-[2px] text-pasha-muted">
        {label}
      </span>
      <span className="font-serif text-lg text-pasha-ink">{value}</span>
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="hidden sm:block w-px h-8 bg-pasha-ink/10" />;
}
