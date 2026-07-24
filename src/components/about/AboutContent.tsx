"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarDays,
  Compass,
  Globe2,
  Handshake,
  Rocket,
  Share2,
  ShieldCheck,
  Network,
  Mail,
  Users,
} from "lucide-react";
import { Kicker } from "@/components/landing/shared/Kicker";
import { MemberAvatar } from "@/components/committee/MemberAvatar";
import type { CommitteeMemberRow } from "@/lib/committee/committee";
import { PillButton } from "@/components/landing/shared/PillButton";
import { Reveal } from "@/components/landing/shared/Reveal";
import { JoinCommunity } from "@/components/community/JoinCommunity";

const EASE = [0.22, 1, 0.36, 1] as const;

// Kept as data rather than inline JSX so the copy stays in one editable block —
// this is the text the committee signs off on.
const INTRO_PARAGRAPHS = [
  "P@SHA Startup Hub is Pakistan’s digital home for startups. Developed through the joint efforts of the P@SHA Startups & Entrepreneurship Committee and the P@SHA Secretariat, it connects founders with opportunities, investors, incubators, accelerators, corporates, mentors, and the broader technology ecosystem.",
  "Whether you are building your first startup or scaling an established venture, the Hub helps you increase visibility, discover support programs, build meaningful connections, and access opportunities that accelerate growth.",
];

const MISSION =
  "Our mission is simple: to strengthen Pakistan’s startup ecosystem by making it easier for startups to be discovered, supported, and connected.";

const WHAT_YOU_FIND = [
  { icon: BadgeCheck, text: "A verified directory of Pakistani startups." },
  { icon: Rocket, text: "Startup profiles showcasing products, founders, and achievements." },
  {
    icon: Handshake,
    text: "Access to ecosystem partners, including incubators, accelerators, investors, mentors, and service providers.",
  },
  { icon: CalendarDays, text: "Community updates, events, and ecosystem opportunities." },
  {
    icon: Share2,
    text: "A central platform that promotes collaboration across Pakistan’s innovation ecosystem.",
  },
];

const SECTIONS = [
  {
    num: "01",
    icon: Globe2,
    title: "Who PASHA is",
    body: "P@SHA — the Pakistan Software Houses Association — was formed in 1992 by a group of software and IT companies to create a functional trade association for Pakistan's IT industry. It remains the only national IT association in the country, representing over 1,600 member companies from its headquarters in Rawalpindi and regional offices in Lahore and Karachi. Its work spans four pillars: industry engagement, government relations, global outreach, and skill development — from policy advocacy and salary surveys to trade delegations and capacity-building programs. P@SHA has won several awards at the Asia Pacific ICT Awards.",
  },
  {
    num: "02",
    icon: BookOpen,
    title: "What this directory is",
    body: "A curated, vetted registry of Pakistani startups, their founders, and the investors and partners who back them. Not a noisy list — a public standard for what Pakistan's startup economy looks like.",
  },
  {
    num: "03",
    icon: Users,
    title: "Who's eligible",
    body: "Startups across sectors — FinTech, AI, AgriTech, SaaS, HealthTech, EdTech, ClimateTech, Gaming, and more. Founders building scalable solutions with verifiable IP. Services-led companies have their own home at other PASHA committees.",
  },
  {
    num: "04",
    icon: ShieldCheck,
    title: "How vetting works",
    body: "Five hard gates (identity, contact, working URL, founder name, description) plus ten scoring dimensions across product maturity, traction, team strength, market attractiveness, international readiness, revenue clarity, ecosystem contribution, defensibility, acquisition repeatability, and strategic fit. Total 0–50. Tiers: Featured (≥35) · Listed (25–34) · Watchlist (15–24).",
  },
  {
    num: "05",
    icon: Network,
    title: "What you get",
    body: "Access to a curated founder network · mentorship and training programs · participation in exclusive partnerships · funding and competition referrals · directory visibility for investors and government delegations · WhatsApp + Facebook community channels for daily peer support.",
  },
  {
    num: "06",
    icon: Mail,
    title: "Contact",
    body: "startups@pasha.org.pk",
    isContact: true,
  },
];

export function AboutContent({
  members = [],
}: {
  // Live roster from Admin → Committee Management. Empty when none is set up,
  // in which case the section hides itself.
  members?: CommitteeMemberRow[];
}) {
  return (
    <>
      {/* ────────────────────────────────────────────────────── */}
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
            <Kicker tone="light">About P@SHA Startup Hub</Kicker>
            <h1 className="mt-5 font-serif font-bold text-3xl sm:text-6xl lg:text-[4.75rem] leading-[0.94] tracking-tight text-white text-balance">
              Pakistan&apos;s digital{" "}
              <span className="text-pasha-red-light">home for startups.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base sm:text-lg text-white/60 leading-relaxed text-pretty">
              Developed through the joint efforts of the P@SHA Startups &amp;
              Entrepreneurship Committee and the P@SHA Secretariat — connecting
              founders with opportunities, investors, incubators, accelerators,
              corporates, mentors, and the broader technology ecosystem.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-3 pt-6 border-t border-white/10">
              <Meta label="Established" value="2026" />
              <Divider />
              <Meta label="Stewarded by" value="PASHA" />
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

      {/* ────────────────────────────────────────────────────── */}
      {/* Narrative intro + mission. Sits ahead of the handbook: this is the
          plain-language "what is this", the handbook is the detail. */}
      <section className="relative bg-white border-t border-pasha-line py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex items-center gap-3 mb-12 pb-4 border-b border-pasha-ink/10"
          >
            <Kicker>Overview</Kicker>
            <span className="font-mono text-[10px] uppercase tracking-[2.5px] text-pasha-ink/40">
              The Hub
            </span>
          </motion.div>

          <div className="space-y-6 text-base sm:text-[17px] text-pasha-ink/75 leading-relaxed text-pretty">
            {INTRO_PARAGRAPHS.map((para, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, delay: i * 0.06, ease: EASE }}
              >
                {para}
              </motion.p>
            ))}
          </div>

          {/* Mission reads as the page's thesis, so it gets pull-quote weight
              rather than sitting as a third indistinguishable paragraph. */}
          <motion.blockquote
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="mt-12 border-l-2 border-pasha-red pl-6 sm:pl-8"
          >
            <p className="font-serif text-xl sm:text-2xl leading-snug tracking-tight text-pasha-ink text-balance">
              {MISSION}
            </p>
          </motion.blockquote>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      <WhatYouFind />

      {/* HANDBOOK (§1–6) — TEMPORARILY HIDDEN.
          The whole <section> is commented out, wrapper included: leaving the
          wrapper live rendered a tall empty white band. Its two CTAs were moved
          into WhatYouFind so the page keeps a call to action — move them back
          here when restoring, wrapped in
          "mt-16 pt-10 border-t border-pasha-ink/10". The SECTIONS data and
          ArticleSection component are deliberately left in place. */}
      {/*
      <section className="relative bg-white border-t border-pasha-line py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex items-center gap-3 mb-12 pb-4 border-b border-pasha-ink/10"
          >
            <Kicker>The handbook</Kicker>
            <span className="font-mono text-[10px] uppercase tracking-[2.5px] text-pasha-ink/40">
              §1–6
            </span>
          </motion.div>

          <div className="space-y-10 sm:space-y-12">
            {SECTIONS.map((section, i) => (
              <ArticleSection key={section.num} section={section} index={i} />
            ))}
          </div>

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
      */}

      {/* ────────────────────────────────────────────────────── */}
      <CommitteeRoster members={members} />

      {/* ────────────────────────────────────────────────────── */}
      <JoinCommunity />
    </>
  );
}

// The five things the Hub offers. Stone background so it reads as a distinct
// band between the two white prose sections either side of it.
function WhatYouFind() {
  return (
    <section className="relative bg-pasha-stone border-t border-pasha-line py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: EASE }}
          className="flex items-center gap-3 mb-12 pb-4 border-b border-pasha-ink/10"
        >
          <Kicker>What you&apos;ll find</Kicker>
          <span className="font-mono text-[10px] uppercase tracking-[2.5px] text-pasha-ink/40">
            {String(WHAT_YOU_FIND.length).padStart(2, "0")} things
          </span>
        </motion.div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {WHAT_YOU_FIND.map((item, i) => (
            <motion.li
              key={item.text}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 2) * 0.06, ease: EASE }}
              whileHover={{ y: -4 }}
              className={
                "group flex h-full items-start gap-4 rounded-2xl border border-pasha-ink/10 bg-white p-6 shadow-[0_2px_16px_rgba(14,14,16,0.05)] transition-all duration-300 hover:border-pasha-red/25 hover:shadow-[0_20px_48px_-14px_rgba(14,14,16,0.16)]" +
                // Odd count: the last card spans both columns so the grid ends flush.
                (i === WHAT_YOU_FIND.length - 1 && WHAT_YOU_FIND.length % 2 === 1
                  ? " sm:col-span-2"
                  : "")
              }
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pasha-stone transition-colors group-hover:bg-pasha-red/10">
                <item.icon
                  className="h-5 w-5 text-pasha-ink/70 transition-colors group-hover:text-pasha-red"
                  strokeWidth={1.75}
                />
              </span>
              <p className="pt-1.5 text-base text-pasha-ink/75 leading-relaxed text-pretty">
                {item.text}
              </p>
            </motion.li>
          ))}
        </ul>

        {/* CTAs HIDDEN — these came from the handbook section. They belong with
            it, so restore them there (not here) when the handbook comes back. */}
        {/*
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mt-12 pt-10 border-t border-pasha-ink/10 flex flex-col sm:flex-row items-center gap-3"
        >
          <PillButton href="/apply" variant="solid" dot={false}>
            Apply to join
          </PillButton>
          <PillButton href="/directory" variant="outline" dot={false}>
            Browse the directory
          </PillButton>
        </motion.div>
        */}
      </div>
    </section>
  );
}

// The committee behind the Hub — chair first, then members. Mirrors the roster
// on /committee, sharing its avatar component so photos and initials-fallbacks
// stay consistent between the two pages.
function CommitteeRoster({ members }: { members: CommitteeMemberRow[] }) {
  const roster = members.filter((m) => m.type === "chairman" || m.type === "member");
  if (roster.length === 0) return null;

  // Chair(s) lead the grid.
  const ordered = [
    ...roster.filter((m) => m.type === "chairman"),
    ...roster.filter((m) => m.type !== "chairman"),
  ];

  // About only previews the core committee; the full roster lives on /committee.
  const CORE_LIMIT = 6;
  const core = ordered.slice(0, CORE_LIMIT);
  const hasMore = ordered.length > core.length;

  return (
    <section className="relative bg-white border-t border-pasha-line py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-8">
        {/* Header matches the handbook section above it */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: EASE }}
          className="flex items-center gap-3 mb-12 pb-4 border-b border-pasha-ink/10"
        >
          <Kicker>The committee</Kicker>
          <span className="font-mono text-[10px] uppercase tracking-[2.5px] text-pasha-ink/40">
            {ordered.length} members
          </span>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {core.map((member, i) => (
            <motion.div
              key={member.email}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.06, ease: EASE }}
              whileHover={{ y: -4 }}
              className="group flex h-full flex-col rounded-2xl border border-pasha-ink/10 bg-white p-6 shadow-[0_2px_16px_rgba(14,14,16,0.05)] transition-all duration-300 hover:border-pasha-red/25 hover:shadow-[0_20px_48px_-14px_rgba(14,14,16,0.16)]"
            >
              {/* Chair / Member tag */}
              <span
                className={
                  "self-start inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[1.5px] " +
                  (member.type === "chairman"
                    ? "bg-pasha-red/[0.07] border border-pasha-red/20 text-pasha-red/90"
                    : "bg-pasha-stone/80 border border-pasha-line/60 text-pasha-ink/40")
                }
              >
                {member.type === "chairman" ? "Chair" : "Committee Member"}
              </span>

              <MemberAvatar
                name={member.name}
                photoUrl={member.photo_url}
                size="w-20 h-20"
                className="mt-5 group-hover:scale-105"
              />

              <div className="mt-4 flex flex-col gap-0.5">
                <h3 className="font-serif text-lg leading-snug text-pasha-ink transition-colors group-hover:text-pasha-red">
                  {member.name}
                </h3>
                {member.role && (
                  <p className="text-xs font-semibold text-pasha-red/70">
                    {member.role}
                  </p>
                )}
                {member.org && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 shrink-0 text-pasha-muted/50" />
                    <p className="truncate text-xs text-pasha-muted/70">{member.org}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Link out to the full roster + committee mission on /committee. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mt-10"
        >
          <PillButton href="/committee" variant="outline" dot={false}>
            {hasMore ? "View all committee members" : "Meet the full committee"}
          </PillButton>
        </motion.div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────
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
