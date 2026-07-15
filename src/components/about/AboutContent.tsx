"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Compass,
  ShieldCheck,
  Network,
  Mail,
  Users,
} from "lucide-react";
import { Kicker } from "@/components/landing/shared/Kicker";
import { PillButton } from "@/components/landing/shared/PillButton";
import { Reveal } from "@/components/landing/shared/Reveal";

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
  return (
    <>
      {/* ──────────────────────────────────────────────────────
          HERO — dark, matches Hero.tsx / DirectoryHero.tsx
          ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-pasha-ink pt-16 pb-14 sm:pt-20 sm:pb-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
        />
        <div aria-hidden className="pointer-events-none absolute -right-56 -top-72 h-[720px] w-[720px] rounded-full bg-pasha-red/[0.32] blur-[80px]" />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-56 -right-16 select-none font-serif font-black leading-none text-white/[0.02]"
          style={{ fontSize: "clamp(20rem,34vw,36rem)" }}
        >
          @
        </span>

        <div className="relative site-container">
          <Reveal>
            <Kicker tone="light">About the directory</Kicker>
            <h1 className="mt-5 font-serif font-bold text-4xl sm:text-6xl lg:text-[4.75rem] leading-[0.94] tracking-tight text-white text-balance">
              P@SHA Startup <span className="text-pasha-red-light">Directory.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base sm:text-lg text-white/60 leading-relaxed text-pretty">
              The Pakistan Software Houses Association (P@SHA) maintains the
              country&apos;s curated directory of Pakistani startups, founders,
              investors, and ecosystem enablers.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-3 pt-6 border-t border-white/10">
              <Meta label="Established" value="2026" />
              <Divider />
              <Meta label="Stewarded by" value="P@SHA" />
              <Divider />
              <Meta label="Committees" value="6" />
              <Divider />
              <span className="inline-flex items-center gap-2 text-white/45">
                <Compass className="w-3.5 h-3.5 text-pasha-red-light" />
                <span className="font-mono text-[10px] uppercase tracking-[1.5px]">
                  Updated daily
                </span>
              </span>
            </div>
          </Reveal>
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
            <Kicker>The handbook</Kicker>
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
            <PillButton href="/apply" variant="solid" dot={false}>
              Apply to join
            </PillButton>
            <PillButton href="/directory" variant="outline" dot={false}>
              Browse the directory
            </PillButton>
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
        <h2 className="font-serif text-2xl font-medium sm:text-3xl tracking-tight text-pasha-ink leading-tight group-hover:text-pasha-red transition-colors duration-200">
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
      <span className="font-mono text-[9px] uppercase tracking-[2px] text-white/45">
        {label}
      </span>
      <span className="font-serif text-lg text-white">{value}</span>
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="hidden sm:block w-px h-8 bg-white/10" />;
}
