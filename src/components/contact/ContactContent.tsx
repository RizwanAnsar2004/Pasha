"use client";

import { motion } from "framer-motion";
import { MapPin, Phone, Mail, ArrowUpRight, Building2 } from "lucide-react";
import { Kicker } from "@/components/landing/shared/Kicker";
import { PillButton } from "@/components/landing/shared/PillButton";
import { Reveal } from "@/components/landing/shared/Reveal";
import { FacebookGlyph } from "@/components/community/FacebookGlyph";
import { TwitterGlyph, InstagramGlyph, YouTubeGlyph, LinkedInGlyph } from "@/components/community/SocialGlyphs";
import { PASHA_SOCIALS } from "@/lib/content/community";
import {
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_HREF,
  SECRETARIAT_ADDRESS,
  SECRETARIAT_MAP_EMBED_URL,
  SECRETARIAT_MAP_URL,
  STARTUPS_EMAIL,
} from "@/lib/content/contact";

const EASE = [0.22, 1, 0.36, 1] as const;

const SOCIAL_GLYPH = {
  facebook: FacebookGlyph,
  twitter: TwitterGlyph,
  instagram: InstagramGlyph,
  youtube: YouTubeGlyph,
  linkedin: LinkedInGlyph,
} as const;

// One contact channel — the whole card is the link, so the tap target is large.
function ChannelCard({
  icon: Icon,
  kicker,
  value,
  href,
  hint,
  external,
  delay,
}: {
  icon: typeof Mail;
  kicker: string;
  value: string;
  href: string;
  hint: string;
  external?: boolean;
  delay: number;
}) {
  return (
    <motion.a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: EASE, delay }}
      className="group relative flex h-full flex-col rounded-[26px] border border-pasha-line bg-white p-7 transition-all duration-200 hover:-translate-y-1 hover:border-pasha-red/40 hover:shadow-[0_20px_44px_rgba(17,17,17,0.08)]"
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-pasha-red/[0.07] text-pasha-red transition-colors group-hover:bg-pasha-red group-hover:text-white">
        <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="mt-5 font-mono text-[10px] uppercase tracking-[2px] text-pasha-muted">
        {kicker}
      </span>
      <span className="mt-2 text-lg font-semibold leading-snug text-pasha-ink break-words group-hover:text-pasha-red transition-colors">
        {value}
      </span>
      <span className="mt-3 text-sm leading-relaxed text-pasha-muted">{hint}</span>
      <ArrowUpRight
        className="absolute right-6 top-6 h-4 w-4 text-pasha-muted/40 transition-all group-hover:text-pasha-red group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        aria-hidden
      />
    </motion.a>
  );
}

export function ContactContent() {
  const socials = PASHA_SOCIALS.filter((s) => s.url);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-pasha-ink pt-16 pb-14 sm:pt-20 sm:pb-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
        />
<<<<<<< HEAD
        <div aria-hidden className="pointer-events-none absolute -right-56 -top-72 h-[720px] w-[720px] rounded-full bg-pasha-red/[0.32] blur-[80px]" />
=======
        <div
          aria-hidden
          className="pointer-events-none absolute -right-56 -top-72 h-[720px] w-[720px] rounded-full bg-pasha-red/[0.32] blur-[80px]"
        />
>>>>>>> 859b1d9477bfe207aa56e45b3d153a450a7afcb8
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-56 -right-16 select-none font-serif font-black leading-none text-white/[0.02]"
          style={{ fontSize: "clamp(20rem,34vw,36rem)" }}
        >
          @
        </span>

        <div className="relative site-container">
<<<<<<< HEAD
          <Reveal>
            <Kicker tone="light">Get in touch</Kicker>
            <h1 className="mt-5 font-serif font-bold text-3xl sm:text-6xl lg:text-[4.75rem] leading-[0.94] tracking-tight text-white text-balance">
              Let&apos;s talk about your <span className="text-pasha-red-light">startup.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base sm:text-lg text-white/60 leading-relaxed text-pretty">
              Questions about the directory, your listing, partnerships, or the wider PASHA
              Startup Hub — the team is a message away.
=======
          <Reveal className="max-w-2xl">
            <Kicker tone="light">Get in touch</Kicker>
            <h1 className="mt-5 font-serif text-3xl font-extrabold leading-[0.94] tracking-tight text-white text-balance sm:text-6xl lg:text-[4.5rem]">
              Talk to the <span className="text-pasha-red-light">P@SHA team.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/60 text-pretty sm:text-lg">
              Questions about membership, your application, or the startup directory — reach
              the Secretariat directly by phone, email, or in person.
>>>>>>> 859b1d9477bfe207aa56e45b3d153a450a7afcb8
            </p>
          </Reveal>
        </div>
      </section>

<<<<<<< HEAD
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
=======
      {/* ── Channels ─────────────────────────────────────────── */}
      <section className="bg-pasha-stone py-16 sm:py-24">
        <div className="site-container">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ChannelCard
              icon={Mail}
              kicker="Email us"
              value={STARTUPS_EMAIL}
              href={`mailto:${STARTUPS_EMAIL}`}
              hint="Opens in your mail app. Applications, directory listings, profile changes, and general enquiries."
              delay={0}
            />
            <ChannelCard
              icon={Phone}
              kicker="Call us"
              value={CONTACT_PHONE_DISPLAY}
              href={CONTACT_PHONE_HREF}
              hint="Sunday to Thursday, during office hours (PKT)."
              delay={0.06}
            />
          </div>

          {/* ── Secretariat ───────────────────────────────────── */}
          <Reveal className="mt-5">
            <div className="grid grid-cols-1 gap-8 overflow-hidden rounded-[30px] border border-pasha-line bg-white p-7 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-pasha-red/[0.07] px-3 py-1 font-mono text-[10px] uppercase tracking-[2px] text-pasha-red">
                  <Building2 className="h-3.5 w-3.5" aria-hidden />
                  Secretariat
                </span>
                <h2 className="mt-5 font-serif text-2xl font-extrabold leading-tight tracking-tight text-pasha-ink sm:text-4xl">
                  Visit us in Rawalpindi.
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-pasha-muted">
                  {SECRETARIAT_ADDRESS}
                </p>
                <div className="mt-7">
                  <PillButton href={SECRETARIAT_MAP_URL} variant="solid" dot={false}>
                    Open in maps
                  </PillButton>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[24px] border border-pasha-line">
                <iframe
                  src={SECRETARIAT_MAP_EMBED_URL}
                  title="Map showing the P@SHA Secretariat at Daftarkhwan Alpha, Rawalpindi"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="block h-[260px] w-full border-0 lg:h-[300px]"
                />
                <a
                  href={SECRETARIAT_MAP_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-2 text-xs font-semibold text-pasha-ink shadow-md backdrop-blur transition-colors hover:bg-pasha-red hover:text-white"
                >
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  Get directions
                </a>
              </div>
            </div>
          </Reveal>

          {/* ── Socials ───────────────────────────────────────── */}
          {socials.length > 0 && (
            <Reveal className="mt-12 flex flex-col items-center gap-5 text-center">
              <span className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-muted">
                Follow P@SHA
              </span>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {socials.map(({ key, label, url }) => {
                  const Glyph = SOCIAL_GLYPH[key];
                  return (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noreferrer noopener"
                      title={label}
                      aria-label={`P@SHA on ${label}`}
                      className="grid h-11 w-11 place-items-center rounded-full border border-pasha-line bg-white text-pasha-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-pasha-red hover:bg-pasha-red hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pasha-red"
                    >
                      <Glyph className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </Reveal>
          )}
        </div>
      </section>
    </>
  );
}
>>>>>>> 859b1d9477bfe207aa56e45b3d153a450a7afcb8
