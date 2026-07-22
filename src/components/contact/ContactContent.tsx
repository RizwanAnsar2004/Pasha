"use client";

import { motion } from "framer-motion";
import { MapPin, Phone, Mail, ArrowUpRight, Building2 } from "lucide-react";
import { Kicker } from "@/components/landing/shared/Kicker";
import { PillButton } from "@/components/landing/shared/PillButton";
import { Reveal } from "@/components/landing/shared/Reveal";
import { FacebookGlyph } from "@/components/community/FacebookGlyph";
import { TwitterGlyph, YouTubeGlyph, LinkedInGlyph } from "@/components/community/SocialGlyphs";
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
        <div
          aria-hidden
          className="pointer-events-none absolute -right-56 -top-72 h-[720px] w-[720px] rounded-full bg-pasha-red/[0.32] blur-[80px]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-56 -right-16 select-none font-serif font-black leading-none text-white/[0.02]"
          style={{ fontSize: "clamp(20rem,34vw,36rem)" }}
        >
          @
        </span>

        <div className="relative site-container">
          <Reveal className="max-w-2xl">
            <Kicker tone="light">Get in touch</Kicker>
            <h1 className="mt-5 font-serif text-3xl font-extrabold leading-[0.94] tracking-tight text-white text-balance sm:text-6xl lg:text-[4.5rem]">
              Talk to the <span className="text-pasha-red-light">P@SHA team.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/60 text-pretty sm:text-lg">
              Questions about membership, your application, or the startup directory — reach
              the Secretariat directly by phone, email, or in person.
            </p>
          </Reveal>
        </div>
      </section>

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
