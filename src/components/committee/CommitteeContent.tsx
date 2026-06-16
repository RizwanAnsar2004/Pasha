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
    color: "bg-emerald-500/10 text-emerald-600",
    title: "Verify & Curate",
    body: "Maintain the highest standards for startup verification and directory quality.",
  },
  {
    icon: Globe2,
    color: "bg-teal-500/10 text-teal-600",
    title: "Connect Ecosystem",
    body: "Bridge startups with investors, corporates, partners, and global opportunities.",
  },
  {
    icon: Users,
    color: "bg-rose-500/10 text-rose-600",
    title: "Amplify Women Founders",
    body: "Reduce barriers and create tailored support for women-led startups.",
  },
  {
    icon: Target,
    color: "bg-violet-500/10 text-violet-600",
    title: "Drive Policy",
    body: "Engage government to shape startup-friendly regulation and national programs.",
  },
  {
    icon: Zap,
    color: "bg-amber-500/10 text-amber-600",
    title: "Build Programs",
    body: "Organise events, accelerators, and capacity-building initiatives year-round.",
  },
  {
    icon: Compass,
    color: "bg-pasha-red/10 text-pasha-red",
    title: "Enable Export",
    body: "Help Pakistan's tech startups access international markets and export leads.",
  },
];

const ACCENTS = [
  "from-rose-500 to-red-500",
  "from-violet-500 to-purple-500",
  "from-emerald-500 to-teal-500",
  "from-pink-500 to-rose-500",
  "from-teal-500 to-cyan-500",
  "from-amber-500 to-orange-500",
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
          HERO — matching the editorial light hero used elsewhere
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
                  className="flex flex-col h-full rounded-2xl bg-white border border-pasha-line p-5 hover:border-pasha-ink/30 hover:shadow-[0_20px_50px_-20px_rgba(14,14,16,0.14)] transition-all duration-300"
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${obj.color} grid place-items-center`}
                  >
                    <obj.icon className="w-5 h-5" strokeWidth={1.75} />
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
          MEET THE COMMITTEE
          ─────────────────────────────────────────────────────── */}
      <section className="relative bg-pasha-stone border-t border-pasha-line py-20 sm:py-28 overflow-hidden">
        <div
          aria-hidden
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full bg-gradient-to-r from-pasha-red/[0.06] via-orange-200/[0.08] to-pasha-red/[0.06] blur-3xl"
        />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: EASE }}
            className="max-w-2xl mb-12"
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

          {/* Featured chairman banner */}
          {chair ? (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.55, ease: EASE }}
            whileHover={{ y: -4 }}
            className="group relative mb-5 rounded-2xl bg-white border border-pasha-red/25 overflow-hidden transition-shadow duration-300 hover:shadow-[0_24px_60px_-20px_rgba(14,14,16,0.2)]"
          >
            <div className="h-1.5 bg-gradient-to-r from-pasha-red to-orange-500" />
            <div className="p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="relative shrink-0">
                <div
                  aria-hidden
                  className="absolute -inset-1.5 rounded-2xl bg-gradient-to-br from-pasha-red to-orange-500 opacity-0 group-hover:opacity-30 blur-md transition-opacity duration-300"
                />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-pasha-red to-orange-500 grid place-items-center text-white font-bold text-lg shadow-sm group-hover:scale-105 transition-transform duration-300">
                  {initials(chair.name)}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-serif text-xl text-pasha-ink leading-tight group-hover:text-pasha-red transition-colors">
                    {chair.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-pasha-red/10 px-2.5 py-1">
                    <Crown className="w-3 h-3 text-pasha-red" />
                    <span className="text-[9px] font-mono uppercase tracking-[1.5px] text-pasha-red font-semibold">
                      Chair
                    </span>
                  </span>
                </div>
                {chair.role ? (
                  <p className="mt-1 text-sm font-medium text-pasha-red">{chair.role}</p>
                ) : null}
                {chair.org ? (
                  <p className="mt-0.5 text-sm text-pasha-muted">{chair.org}</p>
                ) : null}
              </div>

              <span className="inline-flex items-center self-start sm:self-center shrink-0 rounded-full bg-pasha-ink/5 px-3 py-1.5 text-[11px] font-medium text-pasha-muted group-hover:bg-pasha-red/[0.07] group-hover:text-pasha-red transition-colors">
                {COMMITTEE_CHAIR_TAG}
              </span>
            </div>
          </motion.div>
          ) : null}

          {/* Member grid — fills evenly, no dangling cells */}
          {committeeMembers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
            {committeeMembers.map((member, i) => {
              const accent = ACCENTS[(i + 1) % ACCENTS.length];
              return (
                <motion.div
                  key={member.email}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.55, delay: i * 0.08, ease: EASE }}
                  whileHover={{ y: -6 }}
                  className="group relative flex flex-col h-full rounded-2xl bg-white border border-pasha-line hover:border-pasha-ink/30 overflow-hidden transition-shadow duration-300 hover:shadow-[0_24px_60px_-20px_rgba(14,14,16,0.2)]"
                >
                  <div
                    className={`h-1 bg-gradient-to-r ${accent} group-hover:h-1.5 transition-all duration-300`}
                  />

                  <div className="p-6 flex flex-col flex-1 items-center text-center">
                    <div className="relative">
                      <div
                        aria-hidden
                        className={`absolute -inset-1.5 rounded-2xl bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-30 blur-md transition-opacity duration-300`}
                      />
                      <div
                        className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${accent} grid place-items-center text-white font-bold text-base shadow-sm group-hover:scale-110 transition-transform duration-300`}
                      >
                        {initials(member.name)}
                      </div>
                    </div>

                    <h3 className="mt-4 font-serif text-base text-pasha-ink leading-tight group-hover:text-pasha-red transition-colors">
                      {member.name}
                    </h3>
                    {member.role ? (
                      <p className="mt-1 text-sm font-medium text-pasha-red">{member.role}</p>
                    ) : null}
                    {member.org ? (
                      <p className="mt-0.5 text-sm text-pasha-muted">{member.org}</p>
                    ) : null}

                    <span className="mt-auto pt-4 inline-flex items-center justify-center rounded-full bg-pasha-ink/5 px-2.5 py-1 text-[11px] font-medium text-pasha-muted group-hover:bg-pasha-red/[0.07] group-hover:text-pasha-red transition-colors">
                      {COMMITTEE_MEMBER_TAG}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
          ) : !chair ? (
            <p className="text-sm text-pasha-muted">Committee profiles will appear here soon.</p>
          ) : null}
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
