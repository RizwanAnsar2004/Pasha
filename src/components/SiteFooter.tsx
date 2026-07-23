import Link from "next/link";
import { PashaLogo } from "./PashaLogo";
import { PASHA_SOCIALS } from "@/lib/content/community";
import { FacebookGlyph } from "./community/FacebookGlyph";
import { TwitterGlyph, InstagramGlyph, YouTubeGlyph, LinkedInGlyph } from "./community/SocialGlyphs";

const SOCIAL_GLYPH = {
  facebook: FacebookGlyph,
  twitter: TwitterGlyph,
  instagram: InstagramGlyph,
  youtube: YouTubeGlyph,
  linkedin: LinkedInGlyph,
} as const;

export function SiteFooter() {
  return (
    <footer className="bg-pasha-ink text-white">
      <div className="site-container py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2 md:pr-10">
            <PashaLogo width={130} href="/" src="/pasha-logo-dark.svg" />
            <p className="mt-5 text-sm leading-relaxed text-white/50 max-w-md">
              The Pakistan Software Houses Association (PASHA) maintains the PASHA Startup
              Hub — a curated network of founders, mentors, and investors shaping
              Pakistan&apos;s product economy.
            </p>
            <FollowRow />
          </div>
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-[2px] text-white/40 mb-4">Explore</h4>
            <ul className="space-y-3 text-sm text-white/65">
              <li><Link href="/directory" className="hover:text-white transition-colors">Directory</Link></li>
              <li>
                <a
                  href="https://pashaictawards.com/award-categories/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Awards
                </a>
              </li>
              <li><Link href="/events" className="hover:text-white transition-colors">Events</Link></li>
              {/* <li><Link href="/committee" className="hover:text-white transition-colors">Committee</Link></li> */}
              <li><Link href="/#faq" className="hover:text-white transition-colors">FAQs</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-[2px] text-white/40 mb-4">Connect</h4>
            <ul className="space-y-3 text-sm text-white/65">
              <li><Link href="/apply" className="hover:text-white transition-colors">List a company</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">Partner with us</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-14 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-white/40">© {new Date().getFullYear()} PASHA. All rights reserved.</p>
          <p className="text-xs text-white/40">Pakistan&apos;s vetted home for product-native startups.</p>
        </div>
      </div>
    </footer>
  );
}

// "Follow" row — one circular mark per social with a configured url.
function FollowRow() {
  const links = PASHA_SOCIALS.filter((s) => s.url);
  if (links.length === 0) return null;
  return (
    <div className="mt-7 flex items-center gap-3">
      <span className="text-sm text-white/50">Follow</span>
      <div className="flex items-center gap-2.5">
        {links.map(({ key, label, url }) => {
          const Glyph = SOCIAL_GLYPH[key];
          return (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              title={label}
              aria-label={`P@SHA on ${label}`}
              className="grid h-9 w-9 place-items-center rounded-full bg-white text-pasha-ink transition-all duration-200 hover:scale-105 hover:bg-pasha-red hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <Glyph className="h-4 w-4" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
