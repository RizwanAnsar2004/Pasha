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
  Mail,
  Handshake,
  CheckCircle2,
  Globe2,
  Users,
  Target,
  Zap,
  Compass,
  Crown,
  Building2,
} from "lucide-react";
import { initials, cn } from "@/lib/utils";
import {
  COMMITTEE_ACTIVITY_TYPE_STYLES,
  COMMITTEE_CHAIR_TAG,
  COMMITTEE_MEMBER_TAG,
  committeeActivityTypeLabel,
  type CommitteeActivityRow,
  type CommitteeMemberRow,
} from "@/lib/committee";

const EASE = [0.22, 1, 0.36, 1] as const;

const OBJECTIVES = [
  {
    icon: CheckCircle2,
    title: "Verify & Curate",
    body: "Maintain the highest standards for startup verification and directory quality.",
  },
  {
    icon: Globe2,
    title: "Connect Ecosystem",
    body: "Bridge startups with investors, corporates, partners, and global opportunities.",
  },
  {
    icon: Users,
    title: "Amplify Women Founders",
    body: "Reduce barriers and create tailored support for women-led startups.",
  },
  {
    icon: Target,
    title: "Drive Policy",
    body: "Engage government to shape startup-friendly regulation and national programs.",
  },
  {
    icon: Zap,
    title: "Build Programs",
    body: "Organise events, accelerators, and capacity-building initiatives year-round.",
  },
  {
    icon: Compass,
    title: "Enable Export",
    body: "Help Pakistan's tech startups access international markets and export leads.",
  },
];

function activityAuthorDisplay(email: string | null) {
  if (!email) return "Committee";
  const local = email.split("@")[0] ?? email;
  const parts = local.replace(/[._-]/g, " ").trim().split(/\s+/);
  if (parts.length >= 2) {
    return parts
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
  }
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function MemberCard({
  member,
  index,
}: {
  member: CommitteeMemberRow;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: EASE }}
      whileHover={{ y: -6 }}
      className="group relative flex flex-col h-full"
    >
      <div className="relative flex flex-col flex-1 rounded-3xl overflow-hidden border border-pasha-line/50 bg-white shadow-[0_2px_16px_rgba(14,14,16,0.06)] group-hover:shadow-[0_24px_64px_-12px_rgba(14,14,16,0.14)] group-hover:border-pasha-red/20 transition-all duration-500">

        {/* Hero panel */}
        <div className="relative h-28 bg-pasha-stone overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(14,14,16,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(14,14,16,0.04)_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full bg-pasha-red/[0.10] blur-2xl group-hover:bg-pasha-red/[0.18] transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />

          {/* Ghost initial */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-serif text-5xl font-bold text-pasha-ink/[0.07] select-none leading-none group-hover:text-pasha-red/[0.10] transition-colors duration-500">
              {initials(member.name)}
            </span>
          </div>

          {/* Member chip */}
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur border border-pasha-line/60 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[1.5px] text-pasha-ink/40">
            {COMMITTEE_MEMBER_TAG}
          </span>
        </div>

        {/* Avatar overlap */}
        <div className="relative z-10 px-4 -mt-6">
          <div className="w-12 h-12 rounded-2xl bg-pasha-ink/[0.07] ring-[3px] ring-white border border-pasha-line/30 grid place-items-center font-bold text-sm text-pasha-ink/60 group-hover:bg-pasha-red/[0.09] group-hover:text-pasha-red group-hover:border-pasha-red/15 group-hover:scale-105 transition-all duration-300 shadow-sm">
            {initials(member.name)}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 px-4 pt-2.5 pb-4 gap-1">
          <h3 className="font-serif text-base text-pasha-ink leading-tight group-hover:text-pasha-red transition-colors duration-200">
            {member.name}
          </h3>
          {member.role && (
            <p className="text-xs font-semibold text-pasha-red/70">{member.role}</p>
          )}
          {member.org && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Building2 className="w-3 h-3 text-pasha-muted/50 shrink-0" />
              <p className="text-xs text-pasha-muted/70 truncate">{member.org}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function CommitteeContent({
  members,
  activities,
}: {
  members: CommitteeMemberRow[];
  activities: CommitteeActivityRow[];
}) {
  const chair = members.length > 0 ? members[0] : null;
  const committeeMembers = members.length > 1 ? members.slice(1) : [];
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
      {/* ───────────────────────────────────────────────────────
          HERO
          ─────────────────────────────────────────────────────── */}
      <section
        onMouseMove={onMouseMove}
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #FAF8F4 0%, #FFFFFF 100%)",
        }}
      >
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

        <div className="relative mx-auto max-w-4xl px-5 sm:px-8 pt-6 sm:pt-8 lg:pt-10 pb-16 lg:pb-20">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm border border-pasha-line shadow-sm px-3 py-1.5"
          >
            <Handshake className="w-3 h-3 text-pasha-red" />
            <span className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-ink/80">
              P@SHA Startups &amp; Entrepreneurship Committee
            </span>
          </motion.div>

          <h1 className="mt-6 font-serif text-[40px] sm:text-[56px] lg:text-[68px] leading-[0.96] tracking-tight text-pasha-ink text-balance">
            <motion.span
              initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
              className="block"
            >
              Building Pakistan&apos;s
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
              className="block bg-gradient-to-r from-pasha-red via-pasha-red-light to-orange-500 bg-clip-text text-transparent animate-gradient-shift"
            >
              Startup Ecosystem
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="mt-8 text-lg sm:text-xl text-pasha-muted leading-relaxed text-pretty max-w-2xl"
          >
            The P@SHA Startups &amp; Entrepreneurship Committee brings
            together Pakistan&apos;s top founders, investors, corporates, and
            government leaders to actively grow, connect, and support the
            national startup ecosystem.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.85 }}
            className="mt-9 flex flex-col sm:flex-row gap-3"
          >
            <a
              href="mailto:startups@pasha.org.pk"
              className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-pasha-red px-7 py-3.5 text-base font-medium text-white shadow-xl shadow-pasha-red/20 hover:bg-pasha-red-dark transition-all hover:-translate-y-0.5"
            >
              <Mail className="w-4 h-4" />
              Contact Committee
            </a>
            <Link
              href="/apply"
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-pasha-ink/15 bg-white/60 backdrop-blur-sm px-7 py-3.5 text-base font-medium text-pasha-ink hover:bg-white hover:border-pasha-ink/30 transition-all"
            >
              <Handshake className="w-4 h-4 opacity-60" />
              Propose Collaboration
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────
          MISSION & OBJECTIVES
          ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-t border-pasha-line py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-12 lg:gap-16">
            {/* Left: heading + body */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <span className="inline-flex items-center rounded-full bg-pasha-red/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-pasha-red">
                Mission
              </span>
              <h2 className="mt-4 font-serif text-3xl sm:text-4xl tracking-tight text-pasha-ink text-balance">
                Our Mission &amp; Objectives
              </h2>
              <p className="mt-5 text-pasha-muted leading-relaxed text-pretty">
                We exist to make Pakistan&apos;s startup ecosystem more
                discoverable, more connected, and more globally competitive.
                Our committee drives policy, curates the directory, supports
                women founders, and facilitates investment — all under the
                P@SHA umbrella.
              </p>
              <p className="mt-4 text-pasha-muted leading-relaxed text-pretty">
                Every quarter we publish progress updates, verify new
                startups, and host programmes that directly serve founders
                and ecosystem stakeholders.
              </p>
            </motion.div>

            {/* Right: objectives grid */}
            <div className="grid sm:grid-cols-2 gap-5 items-stretch">
              {OBJECTIVES.map((obj, i) => (
                <motion.div
                  key={obj.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: EASE }}
                  className="flex flex-col h-full rounded-2xl bg-white border border-pasha-line p-5 hover:border-pasha-red/20 hover:shadow-[0_20px_50px_-20px_rgba(14,14,16,0.14)] transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-pasha-red/[0.08] border border-pasha-red/10 grid place-items-center">
                    <obj.icon className="w-5 h-5 text-pasha-red/70" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-4 font-serif text-lg text-pasha-ink leading-tight">
                    {obj.title}
                  </h3>
                  <p className="mt-2 text-sm text-pasha-muted leading-relaxed">
                    {obj.body}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────
          MEET THE COMMITTEE — ORGANOGRAM
          ─────────────────────────────────────────────────────── */}
      <section className="relative bg-pasha-stone border-t border-pasha-line py-20 sm:py-28 overflow-hidden">
        <div
          aria-hidden
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full bg-gradient-to-r from-pasha-red/[0.06] via-orange-200/[0.08] to-pasha-red/[0.06] blur-3xl"
        />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">

          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: EASE }}
            className="text-center max-w-2xl mx-auto mb-14"
          >
            <span className="inline-flex items-center rounded-full bg-pasha-red/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-pasha-red">
              Committee Members
            </span>
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl tracking-tight text-pasha-ink text-balance">
              Meet the Committee
            </h2>
            <p className="mt-4 text-pasha-muted text-lg leading-relaxed text-pretty">
              The founders and operators steering P@SHA&apos;s startup
              programmes, verification standards, and ecosystem partnerships.
            </p>
          </motion.div>

          {/* ── ORGANOGRAM ── */}
          {chair ? (
            <div className="flex flex-col items-center">

              {/* TIER 1: Chair */}
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, ease: EASE }}
                whileHover={{ y: -4 }}
                className="group relative w-full max-w-xs sm:max-w-sm"
              >
                <div className="relative flex flex-col rounded-3xl overflow-hidden border border-pasha-red/20 bg-white shadow-[0_4px_24px_rgba(14,14,16,0.10)] group-hover:shadow-[0_24px_64px_-12px_rgba(14,14,16,0.18)] group-hover:border-pasha-red/35 transition-all duration-500">

                  {/* Hero panel */}
                  <div className="relative h-36 bg-gradient-to-br from-pasha-stone via-pasha-stone to-white overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(14,14,16,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(14,14,16,0.04)_1px,transparent_1px)] bg-[size:28px_28px]" />
                    <div className="absolute -bottom-6 -left-6 w-44 h-44 rounded-full bg-pasha-red/[0.15] blur-2xl group-hover:bg-pasha-red/[0.25] transition-all duration-500" />
                    <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full bg-pasha-red/[0.07] blur-xl" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />

                    {/* Ghost initial */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-serif text-7xl font-bold text-pasha-ink/[0.07] select-none leading-none group-hover:text-pasha-red/[0.12] transition-colors duration-500">
                        {initials(chair.name)}
                      </span>
                    </div>

                    {/* Chair badge */}
                    <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur border border-pasha-red/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[1.5px] text-pasha-red/90 shadow-sm">
                      <Crown className="w-2.5 h-2.5" /> Chair
                    </span>
                  </div>

                  {/* Avatar overlap */}
                  <div className="relative z-10 px-6 -mt-8">
                    <div className="w-16 h-16 rounded-2xl bg-pasha-ink/[0.07] ring-4 ring-white border border-pasha-line/30 grid place-items-center font-bold text-lg text-pasha-ink/60 group-hover:bg-pasha-red/[0.09] group-hover:text-pasha-red group-hover:border-pasha-red/15 group-hover:scale-105 transition-all duration-300 shadow-sm">
                      {initials(chair.name)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-6 pt-3 pb-6">
                    <h3 className="font-serif text-2xl text-pasha-ink leading-tight group-hover:text-pasha-red transition-colors duration-200">
                      {chair.name}
                    </h3>
                    {chair.role && (
                      <p className="mt-1 text-sm font-semibold text-pasha-red/70">{chair.role}</p>
                    )}
                    {chair.org && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Building2 className="w-3.5 h-3.5 text-pasha-muted/50 shrink-0" />
                        <p className="text-sm text-pasha-muted/70">{chair.org}</p>
                      </div>
                    )}
                    <p className="mt-3 text-xs text-pasha-muted/50 leading-relaxed">
                      {COMMITTEE_CHAIR_TAG}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Connector: vertical stem from chair */}
              {committeeMembers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scaleY: 0 }}
                  whileInView={{ opacity: 1, scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.3 }}
                  style={{ transformOrigin: "top" }}
                  className="w-px h-8 bg-gradient-to-b from-pasha-red/40 to-pasha-line"
                />
              )}

              {/* TIER 2: Members — single row with horizontal bus + drop lines */}
              {committeeMembers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  className="relative w-full"
                >
                  {/* Horizontal bus spanning full width */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-pasha-line" />

                  {/* Single-row flex — overflow-x-auto on small screens */}
                  <div className="flex flex-nowrap gap-4 overflow-x-auto pb-2 scrollbar-none">
                    {committeeMembers.map((member, i) => (
                      <div
                        key={member.email}
                        className="relative flex-1 min-w-[180px] max-w-[240px] pt-8"
                      >
                        {/* Drop line from bus to card */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-8 bg-pasha-line" />
                        {/* Junction dot */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-pasha-line" />
                        <MemberCard member={member} index={i} />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

            </div>
          ) : (
            <p className="text-sm text-pasha-muted text-center">Committee profiles will appear here soon.</p>
          )}

        </div>
      </section>

      {/* ───────────────────────────────────────────────────────
          ACTIVITY TIMELINE
          ─────────────────────────────────────────────────────── */}
      {activities.length > 0 ? (
        <section className="relative bg-white border-t border-pasha-line py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: EASE }}
              className="max-w-2xl mb-12"
            >
              <span className="inline-flex items-center rounded-full bg-pasha-red/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-pasha-red">
                Updates
              </span>
              <h2 className="mt-4 font-serif text-3xl sm:text-4xl tracking-tight text-pasha-ink text-balance">
                Committee Activity
              </h2>
              <p className="mt-4 text-pasha-muted text-lg leading-relaxed text-pretty">
                Verification milestones, programmes, and ecosystem initiatives
                from the committee.
              </p>
            </motion.div>

            <ul className="rounded-2xl border border-pasha-line bg-white divide-y divide-pasha-line overflow-hidden">
              {activities.map((row, i) => {
                const styles = COMMITTEE_ACTIVITY_TYPE_STYLES[row.type];
                return (
                  <motion.li
                    key={row.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.45, delay: i * 0.04, ease: EASE }}
                    className="px-6 py-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("text-sm font-semibold tabular-nums", styles.date)}>
                        {new Date(row.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          styles.badge
                        )}
                      >
                        {committeeActivityTypeLabel(row.type)}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-pasha-ink">{row.title}</h3>
                    <p className="mt-1 text-sm text-pasha-muted leading-relaxed">
                      {row.description}
                    </p>
                    <p className="mt-2 text-xs text-pasha-muted/80">
                      by {activityAuthorDisplay(row.author_email)}
                    </p>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ───────────────────────────────────────────────────────
          CTA
          ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-t border-pasha-line py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl tracking-tight text-pasha-ink text-balance">
            Want to collaborate with the committee?
          </h2>
          <p className="mt-3 text-pasha-muted leading-relaxed text-pretty max-w-xl mx-auto">
            Whether you&apos;re a founder, investor, or partner organisation,
            we&apos;d love to hear from you.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <a
              href="mailto:startups@pasha.org.pk"
              className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-pasha-ink px-7 py-3.5 text-base font-medium text-white shadow-xl shadow-pasha-ink/20 hover:bg-pasha-red transition-all hover:-translate-y-0.5"
            >
              Contact Committee
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
