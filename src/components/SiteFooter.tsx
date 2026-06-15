import Link from "next/link";
import { PashaLogo } from "./PashaLogo";

export function SiteFooter() {
  return (
    <footer className="border-t border-pasha-line bg-pasha-stone/40">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <PashaLogo width={120} href="/" />
            <p className="mt-4 text-sm leading-relaxed text-pasha-muted max-w-md">
              The Pakistan Software Houses Association (P@SHA) maintains the
              P@SHA Startup Directory — a curated network of founders,
              mentors, and investors.
            </p>
          </div>
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-muted mb-4">
              Community
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/apply" className="hover:text-pasha-red">Apply to join</Link></li>
              <li><Link href="/directory" className="hover:text-pasha-red">Directory</Link></li>
              <li><Link href="/about" className="hover:text-pasha-red">About PSEC</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-muted mb-4">
              P@SHA
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="https://www.pasha.org.pk/" target="_blank" rel="noreferrer noopener" className="hover:text-pasha-red">pasha.org.pk</a></li>
              <li><a href="https://www.linkedin.com/company/pashapk/" target="_blank" rel="noreferrer noopener" className="hover:text-pasha-red">LinkedIn</a></li>
              <li><a href="https://x.com/PASHAORG" target="_blank" rel="noreferrer noopener" className="hover:text-pasha-red">X / Twitter</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-pasha-line">
          <p className="text-xs text-pasha-muted">
            © {new Date().getFullYear()} P@SHA. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
