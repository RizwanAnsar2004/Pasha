"use client";

import { useState, type FormEvent } from "react";
import { Mail, MessageCircle, ArrowUpRight, Building2 } from "lucide-react";
import { Kicker } from "@/components/landing/shared/Kicker";
import { PillButton } from "@/components/landing/shared/PillButton";
import { Reveal } from "@/components/landing/shared/Reveal";
import { JoinCommunity } from "@/components/community/JoinCommunity";
import { PASHA_FACEBOOK } from "@/lib/content/community";

const CONTACT_EMAIL = "startups@pasha.org.pk";

const CHANNELS = [
  {
    icon: Mail,
    label: "Email",
    value: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
  },
  {
    icon: MessageCircle,
    label: "Community",
    value: "Facebook group",
    href: PASHA_FACEBOOK,
  },
  {
    icon: LinkedInGlyph,
    label: "LinkedIn",
    value: "PASHA",
    href: "https://www.linkedin.com/company/pashapk/",
  },
  {
    icon: Building2,
    label: "Stewarded by",
    value: "Pakistan Software Houses Association",
    href: "/about",
  },
];

export function ContactContent() {
  return (
    <>
      {/* ── Hero ── */}
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
            <Kicker tone="light">Get in touch</Kicker>
            <h1 className="mt-5 font-serif font-bold text-3xl sm:text-6xl lg:text-[4.75rem] leading-[0.94] tracking-tight text-white text-balance">
              Let&apos;s talk about your <span className="text-pasha-red-light">startup.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base sm:text-lg text-white/60 leading-relaxed text-pretty">
              Questions about the directory, your listing, partnerships, or the wider PASHA
              Startup Hub — the team is a message away.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Body ── */}
      <section className="relative bg-white border-t border-pasha-line py-20 sm:py-28">
        <div className="site-container">
          <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-16">
            {/* Contact channels */}
            <Reveal>
              <Kicker>Reach us directly</Kicker>
              <h2 className="mt-4 font-serif text-2xl sm:text-4xl font-extrabold tracking-tight text-pasha-ink text-balance">
                Pick whatever&apos;s easiest.
              </h2>
              <p className="mt-3 max-w-sm text-pasha-muted leading-relaxed">
                For listing edits, verification, or press — email is fastest. For everyday
                founder chatter, find us in the community.
              </p>

              <ul className="mt-9 space-y-3">
                {CHANNELS.map((channel) => (
                  <li key={channel.label}>
                    <a
                      href={channel.href}
                      target={channel.href.startsWith("http") ? "_blank" : undefined}
                      rel={channel.href.startsWith("http") ? "noreferrer noopener" : undefined}
                      className="group flex items-center justify-between gap-4 rounded-2xl border border-pasha-ink/10 bg-pasha-stone/60 px-5 py-4 transition-all duration-200 hover:border-pasha-red/25 hover:bg-white hover:shadow-[0_14px_32px_rgba(23,23,23,0.06)]"
                    >
                      <span className="flex items-center gap-3.5 min-w-0">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-pasha-ink/70 shadow-sm group-hover:text-pasha-red transition-colors">
                          <channel.icon className="h-4.5 w-4.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-mono text-[10px] uppercase tracking-[1.5px] text-pasha-muted">
                            {channel.label}
                          </span>
                          <span className="block truncate font-semibold text-pasha-ink">{channel.value}</span>
                        </span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-pasha-ink/30 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-pasha-red" />
                    </a>
                  </li>
                ))}
              </ul>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <PillButton href="/apply" variant="solid" dot={false}>
                  List your startup
                </PillButton>
                <PillButton href="/directory" variant="outline" dot={false}>
                  Browse the directory
                </PillButton>
              </div>
            </Reveal>

            {/* Contact form */}
            <Reveal delay={0.05}>
              <ContactForm />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Community ── */}
      <JoinCommunity />
    </>
  );
}

const SUBJECTS = ["General question", "Startup listing", "Verification", "Partnership", "Press"] as const;

function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState<(typeof SUBJECTS)[number]>(SUBJECTS[0]);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = `${message}\n\n— ${name}${email ? ` (${email})` : ""}`;
    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      `[${subject}] from ${name || "the PASHA website"}`
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSent(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[28px] border border-pasha-ink/10 bg-pasha-stone/60 p-6 sm:p-8 shadow-[0_18px_50px_rgba(23,23,23,0.05)]"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Your name">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ayesha Khan"
            className="h-12 w-full rounded-xl border border-pasha-ink/10 bg-white px-4 text-sm text-pasha-ink outline-none transition focus:border-pasha-red focus:ring-4 focus:ring-pasha-red/10"
          />
        </Field>
        <Field label="Email">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@startup.com"
            className="h-12 w-full rounded-xl border border-pasha-ink/10 bg-white px-4 text-sm text-pasha-ink outline-none transition focus:border-pasha-red focus:ring-4 focus:ring-pasha-red/10"
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Subject">
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value as (typeof SUBJECTS)[number])}
            className="h-12 w-full rounded-xl border border-pasha-ink/10 bg-white px-4 text-sm text-pasha-ink outline-none transition focus:border-pasha-red focus:ring-4 focus:ring-pasha-red/10"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Message">
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what you need — we'll route it to the right person."
            className="w-full resize-none rounded-xl border border-pasha-ink/10 bg-white px-4 py-3 text-sm text-pasha-ink outline-none transition focus:border-pasha-red focus:ring-4 focus:ring-pasha-red/10"
          />
        </Field>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2.5 rounded-full bg-pasha-red px-7 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-pasha-red-dark"
        >
          Send message
          <ArrowUpRight className="h-4 w-4" />
        </button>
        <p className="text-xs text-pasha-muted">
          {sent ? "Opening your email app now…" : "Opens in your email app, addressed to the PASHA team."}
        </p>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[1.5px] text-pasha-ink/50">{label}</span>
      {children}
    </label>
  );
}

function LinkedInGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M20.45 20.45h-3.55v-5.56c0-1.32-.03-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.65H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.61 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 110-4.13 2.06 2.06 0 010 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}
