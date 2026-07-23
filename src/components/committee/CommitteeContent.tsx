"use client";

import { motion } from "framer-motion";
import {
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
import { Kicker } from "@/components/landing/shared/Kicker";
import { PillButton } from "@/components/landing/shared/PillButton";
import { Reveal } from "@/components/landing/shared/Reveal";
import {
  COMMITTEE_ACTIVITY_TYPE_STYLES,
  COMMITTEE_CHAIR_TAG,
  COMMITTEE_MEMBER_TAG,
  committeeActivityTypeLabel,
  type CommitteeActivityRow,
  type CommitteeMemberRow,
} from "@/lib/committee/committee";

const EASE = [0.22, 1, 0.36, 1] as const;

// Static committee roster — source of truth for the organogram.
const STATIC_COMMITTEE: CommitteeMemberRow[] = [
  { email: "chair@pasha.org.pk",  name: "Usman Akbar",            role: "CEO",                                org: "PureLogics",          type: "chairman", added_at: "" },
  { email: "m01@pasha.org.pk",    name: "Noman Hassan",           role: "CEO",                                org: "GeekInn",             type: "member", added_at: "" },
  { email: "m02@pasha.org.pk",    name: "Talha Bin Afzal",        role: "CEO",                                org: "Algoryte",            type: "member", added_at: "" },
  { email: "m03@pasha.org.pk",    name: "Shawana Iftikhar",       role: "CEO",                                org: "Work Generations",    type: "member", added_at: "" },
  { email: "m04@pasha.org.pk",    name: "Syed Junaid Ahmad",      role: "COO",                                org: "Softoo",              type: "member", added_at: "" },
  { email: "m05@pasha.org.pk",    name: "Asim Ishaq Khan",        role: "Director",                           org: "LMKT",               type: "member", added_at: "" },
  { email: "m06@pasha.org.pk",    name: "Muhammad Omer Khan",     role: "CEO",                                org: "Bits Collision",      type: "member", added_at: "" },
  { email: "m07@pasha.org.pk",    name: "Amna Masood",            role: "CEO",                                org: "MavenLogix",          type: "member", added_at: "" },
  { email: "m08@pasha.org.pk",    name: "Syed Rizwan Ali",        role: "Head of Business Incubation Center", org: "Bahria University",   type: "member", added_at: "" },
  { email: "m09@pasha.org.pk",    name: "Muhammad Irshad Kanwal", role: "CEO",                                org: "AllZone Technologies", type: "member", added_at: "" },
  { email: "m10@pasha.org.pk",    name: "Hamad Pervaiz",          role: "CEO",                                org: "BearPlex",            type: "member", added_at: "" },
  { email: "m11@pasha.org.pk",    name: "Muhammad Azeem Akram",   role: "CEO",                                org: "AlphaSquad Technologies", type: "member", added_at: "" },
];

const OBJECTIVES = [
  {
    icon: CheckCircle2,
    title: "Policy Advocacy",
    body: "Maintain the highest standards for startup verification and directory quality.",
  },
  {
    icon: Globe2,
    title: "Startup Enablement",
    body: "Bridge startups with investors, corporates, partners, and global opportunities.",
  },
  {
    icon: Users,
    title: "Awareness & Eduation",
    body: "Reduce barriers and create tailored support for women-led startups.",
  },
  {
    icon: Target,
    title: "Promote Collaboration",
    body: "Engage government to shape startup-friendly regulation and national programs.",
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
      transition={{ duration: 0.5, delay: index * 0.05, ease: EASE }}
      whileHover={{ y: -6 }}
      className="group h-full"
    >
      <div className="flex h-full flex-col rounded-2xl border border-pasha-line/60 bg-white shadow-[0_2px_16px_rgba(14,14,16,0.06)] group-hover:shadow-[0_20px_48px_-12px_rgba(14,14,16,0.14)] group-hover:border-pasha-red/20 transition-all duration-400 p-5">
        {/* Member chip */}
        <span className="self-start inline-flex items-center rounded-full bg-pasha-stone/80 border border-pasha-line/60 px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-[1.5px] text-pasha-ink/40">
          {COMMITTEE_MEMBER_TAG}
        </span>

        {/* Avatar */}
        <div className="mt-4 w-12 h-12 rounded-2xl bg-pasha-ink/[0.07] border border-pasha-line/30 grid place-items-center font-bold text-sm text-pasha-ink/60 group-hover:bg-pasha-red/[0.09] group-hover:text-pasha-red group-hover:border-pasha-red/15 group-hover:scale-105 transition-all duration-300 shadow-sm shrink-0">
          {initials(member.name)}
        </div>

        {/* Content */}
        <div className="mt-3 flex flex-col gap-0.5">
          <h3 className="font-serif text-[15px] text-pasha-ink leading-snug group-hover:text-pasha-red transition-colors duration-200">
            {member.name}
          </h3>
          {member.role && (
            <p className="text-[11px] font-semibold text-pasha-red/70">{member.role}</p>
          )}
          {member.org && (
            <div className="flex items-center gap-1.5 mt-1">
              <Building2 className="w-3 h-3 text-pasha-muted/50 shrink-0" />
              <p className="text-[11px] text-pasha-muted/70 truncate">{member.org}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ChairCard({ chair, index }: { chair: CommitteeMemberRow; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: EASE }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <div className="relative flex flex-col overflow-hidden rounded-[28px] border border-pasha-red/25 bg-white shadow-[0_8px_32px_rgba(14,14,16,0.10)] group-hover:shadow-[0_28px_70px_-16px_rgba(14,14,16,0.18)] group-hover:border-pasha-red/40 transition-all duration-500 p-7 sm:p-8">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-10 select-none font-serif font-black leading-none text-pasha-red/[0.05]"
          style={{ fontSize: "9rem" }}
        >
          @
        </span>

        {/* Chair badge */}
        <span className="relative self-start inline-flex items-center gap-1.5 rounded-full bg-pasha-red/[0.07] border border-pasha-red/20 px-3 py-1 text-[9px] font-bold uppercase tracking-[1.5px] text-pasha-red/90">
          <Crown className="w-3 h-3" /> Chair
        </span>

        {/* Avatar */}
        <div className="relative mt-6 w-16 h-16 rounded-2xl bg-pasha-red/[0.08] border border-pasha-red/15 grid place-items-center font-bold text-lg text-pasha-red group-hover:bg-pasha-red/[0.14] group-hover:scale-105 transition-all duration-300 shadow-sm shrink-0">
          {initials(chair.name)}
        </div>

        {/* Content */}
        <div className="relative mt-5 flex flex-col gap-1">
          <h3 className="font-serif text-xl text-pasha-ink leading-snug group-hover:text-pasha-red transition-colors duration-200">
            {chair.name}
          </h3>
          {chair.role && (
            <p className="text-sm font-semibold text-pasha-red/70">{chair.role}</p>
          )}
          {chair.org && (
            <div className="flex items-center gap-1.5 mt-1">
              <Building2 className="w-3.5 h-3.5 text-pasha-muted/50 shrink-0" />
              <p className="text-sm text-pasha-muted/70">{chair.org}</p>
            </div>
          )}
          <p className="mt-5 pt-5 border-t border-pasha-line text-xs text-pasha-muted/60 leading-relaxed">
            {COMMITTEE_CHAIR_TAG}
          </p>
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
  // Prefer live committee-management data; fall back to the static roster only when no members have been added yet (e.g.
  const source = members.length > 0 ? members : STATIC_COMMITTEE;
  // Public page shows only Chairmen and Committee Members.
  const roster = source.filter((m) => m.type === "chairman" || m.type === "member");
  // Chair(s) are explicit (member type).
  const chairs = roster.filter((m) => m.type === "chairman");
  const committeeMembers = roster.filter((m) => m.type !== "chairman");

  return (
    <>
      {/* ─────────────────────────────────────────────────────── */}
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
            <Kicker tone="light">PASHA Startup &amp; Entrepreneurship Committee</Kicker>
            <h1 className="mt-5 font-serif font-extrabold text-3xl sm:text-6xl lg:text-[4.75rem] leading-[0.94] tracking-tight text-white text-balance">
              Building Pakistan&apos;s <span className="text-pasha-red-light">startup ecosystem.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base sm:text-lg text-white/60 leading-relaxed text-pretty">
              The PASHA Startup &amp; Entrepreneurship Committee brings
              together Pakistan&apos;s top founders, investors, corporates, and
              government leaders to actively grow, connect, and support the
              national startup ecosystem.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <PillButton href="/contact" variant="solid" dot={false} arrow={false}>
                <Mail className="w-4 h-4" />
                Contact Committee
              </PillButton>
              <PillButton href="/contact" variant="outline-light" dot={false} arrow={false}>
                <Handshake className="w-4 h-4 opacity-60" />
                Propose Collaboration
              </PillButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-t border-pasha-line py-20 sm:py-28">
        <div className="site-container">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-12 lg:gap-16">
            {/* Left: heading + body */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <Kicker>Mission</Kicker>
              <h2 className="mt-4 font-serif text-3xl sm:text-5xl font-extrabold tracking-tight text-pasha-ink text-balance">
                Our Mission &amp; Objectives
              </h2>
              <p className="mt-5 text-pasha-muted leading-relaxed text-pretty">
                We exist to make Pakistan&apos;s startup ecosystem more
                discoverable, more connected, and more globally competitive.
                Our committee drives policy, curates the directory, supports
                women founders, and facilitates investment — all under the
                PASHA umbrella.
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
                  <h3 className="mt-4 font-serif font-semibold text-lg text-pasha-ink leading-tight">
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

      {/* ─────────────────────────────────────────────────────── */}
      <section className="relative bg-pasha-stone border-t border-pasha-line py-20 sm:py-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full bg-gradient-to-r from-pasha-red/[0.06] via-accent-coral/[0.08] to-pasha-red/[0.06] blur-3xl" />
        </div>
        <div className="relative site-container">

          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: EASE }}
            className="text-center max-w-2xl mx-auto mb-14"
          >
            <div className="flex justify-center">
              <Kicker>Committee Members</Kicker>
            </div>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl font-extrabold tracking-tight text-pasha-ink text-balance">
              Meet the Committee
            </h2>
            <p className="mt-4 text-pasha-muted text-lg leading-relaxed text-pretty">
              The founders and operators steering PASHA&apos;s startup
              programmes, verification standards, and ecosystem partnerships.
            </p>
          </motion.div>

          {/* ── CHAIR + MEMBERS ── */}
          {chairs.length > 0 || committeeMembers.length > 0 ? (
            <div
              className={cn(
                "grid gap-8 lg:gap-10 items-start",
                chairs.length > 0 ? "lg:grid-cols-[300px_minmax(0,1fr)]" : "lg:grid-cols-1"
              )}
            >
              {/* Left: Chair(s) */}
              {chairs.length > 0 && (
                <div className="flex flex-col gap-5 lg:sticky lg:top-20">
                  {chairs.map((chair, ci) => (
                    <ChairCard key={chair.email} chair={chair} index={ci} />
                  ))}
                </div>
              )}

              {/* Right: All other committee members */}
              {committeeMembers.length > 0 && (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {committeeMembers.map((member, i) => (
                    <MemberCard key={member.email} member={member} index={i} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-pasha-muted text-center">Committee profiles will appear here soon.</p>
          )}

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────── */}
      {activities.length > 0 ? (
        <section className="relative bg-white border-t border-pasha-line py-20 sm:py-28">
          <div className="site-container">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: EASE }}
              className="max-w-2xl mb-12"
            >
              <Kicker>Updates</Kicker>
              <h2 className="mt-4 font-serif text-3xl sm:text-5xl font-extrabold tracking-tight text-pasha-ink text-balance">
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

      {/* ─────────────────────────────────────────────────────── */}
      <section className="bg-pasha-stone py-14 sm:py-20">
        <div className="site-container">
          <Reveal className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-pasha-ink to-[#2e2a27] px-7 py-10 sm:px-12 sm:py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
            <span
              aria-hidden
              className="pointer-events-none absolute -right-4 -top-24 select-none font-serif font-black leading-none text-white/[0.04]"
              style={{ fontSize: "19rem" }}
            >
              @
            </span>
            <div className="relative">
              <Kicker tone="light" className="text-pasha-red-light">
                Get involved
              </Kicker>
              <h2 className="mt-4 max-w-xl font-serif text-2xl sm:text-4xl lg:text-[3.5rem] font-extrabold leading-[0.98] tracking-tight text-white">
                Want to collaborate with the committee?
              </h2>
              <p className="mt-4 max-w-md text-white/55 text-base leading-relaxed">
                Whether you&apos;re a founder, investor, or partner
                organisation, we&apos;d love to hear from you.
              </p>
            </div>
            <PillButton href="/contact" variant="light" dot={false} className="relative shrink-0">
              Contact Committee
            </PillButton>
          </Reveal>
        </div>
      </section>
    </>
  );
}
