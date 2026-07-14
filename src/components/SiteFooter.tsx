import Link from "next/link";
import { PashaLogo } from "./PashaLogo";

export function SiteFooter() {
  return (
    <footer className="bg-pasha-ink text-white">
      <div className="mx-auto max-w-[1480px] px-5 sm:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2 md:pr-10">
            <PashaLogo width={130} href="/" className="brightness-0 invert" />
            <p className="mt-5 text-sm leading-relaxed text-white/50 max-w-md">
              The Pakistan Software Houses Association (P@SHA) maintains the P@SHA Startup
              Directory — a curated network of founders, mentors, and investors shaping
              Pakistan&apos;s product economy.
            </p>
          </div>
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-[2px] text-white/40 mb-4">Explore</h4>
            <ul className="space-y-3 text-sm text-white/65">
              <li><Link href="/directory" className="hover:text-white transition-colors">Directory</Link></li>
              <li><Link href="/#awards" className="hover:text-white transition-colors">Awards</Link></li>
              <li><Link href="/events" className="hover:text-white transition-colors">Events</Link></li>
              <li><Link href="/#faq" className="hover:text-white transition-colors">FAQs</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-[2px] text-white/40 mb-4">Connect</h4>
            <ul className="space-y-3 text-sm text-white/65">
              <li><Link href="/apply" className="hover:text-white transition-colors">List a company</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">Partner with us</Link></li>
              <li><a href="https://www.linkedin.com/company/pashapk/" target="_blank" rel="noreferrer noopener" className="hover:text-white transition-colors">LinkedIn</a></li>
              <li><a href="mailto:hello@pasha.org.pk" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-14 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-white/40">© {new Date().getFullYear()} P@SHA. All rights reserved.</p>
          <p className="text-xs text-white/40">Pakistan&apos;s vetted home for product-native startups.</p>
        </div>
      </div>
    </footer>
  );
}
