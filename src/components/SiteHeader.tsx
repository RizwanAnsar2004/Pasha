"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PashaLogo } from "./PashaLogo";
import { PillButton } from "./landing/shared/PillButton";
import { cn } from "@/lib/utils";
import { PASHA_FACEBOOK } from "@/lib/content/community";
import { FacebookGlyph } from "./community/FacebookGlyph";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/directory", label: "Directory" },
  { href: "mailto:startups@pasha.org.pk", label: "Contact" },
];

export function SiteHeader({ variant = "default" }: { variant?: "default" | "transparent" }) {
  void variant; // kept for call-site compatibility — header is sticky/opaque everywhere
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Announcement bar */}
      <div className="hidden sm:block bg-pasha-ink text-white/70">
        <div className="site-container">
          <div className="flex items-center justify-between h-8 text-xs"  style={{ fontSize: "0.65rem" }}>
            <span className="font-mono ">
              <strong className="text-white">P@SHA Startup Hub</strong>  · Discover ambitious startups across Pakistan
            </span>
            <Link href="/apply" className="inline-flex items-center gap-1.5 text-white hover:text-pasha-red-light transition-colors">
              Applications are open
              <span aria-hidden>&rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div
        className={cn(
          "w-full transition-shadow duration-300",
          scrolled ? "shadow-[0_1px_0_rgba(23,23,23,0.06)]" : ""
        )}
        style={{
          background: "linear-gradient(90deg, #EFEDE9 0%, #F3E6E1 55%, #F5DBD5 100%)",
        }}
      >
        <div className="site-container">
          <div className="flex items-center justify-between h-[74px]">
            <PashaLogo width={125} priority />

            <div className="hidden lg:flex items-center gap-9">
              <nav className="flex items-center gap-9">
                {NAV_LINKS.map((link) => {
                  const active =
                    link.href === "/"
                      ? pathname === "/"
                      : pathname === link.href || pathname?.startsWith(`${link.href}/`);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "relative text-[12px] font-semibold transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-[2px] after:w-0 after:bg-pasha-red after:transition-all hover:after:w-full",
                        active ? "text-pasha-red" : "text-pasha-ink/80 hover:text-pasha-ink"
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex items-center gap-3">
                {/* Community link — icon-only so it stays out of the way of the */}
                <a
                  href={PASHA_FACEBOOK}
                  target="_blank"
                  rel="noreferrer noopener"
                  title="Join the P@SHA community on Facebook"
                  aria-label="Join the P@SHA community on Facebook"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-pasha-ink/10 bg-white text-pasha-ink/60 shadow-sm transition-all duration-200 hover:scale-105 hover:border-pasha-red/30 hover:text-pasha-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pasha-red"
                >
                  <FacebookGlyph className="h-4 w-4" />
                </a>
                <PillButton
                  href="/directory"
                  variant="outline"
                  dot={false}
                  arrow={false}
                  className="border-pasha-ink/10 pl-5 pr-6 py-2.5 text-xs font-semibold shadow-sm"
                >
                  <Search className="h-4 w-4" />
                  Search directory
                </PillButton>
                <PillButton href="/apply" variant="solid" dot={false} className="pl-6 pr-6 py-2.5 text-xs font-semibold">
                  List your startup
                </PillButton>
              </div>
            </div>

            <button
              type="button"
              className="lg:hidden rounded-full p-2 -mr-2 text-pasha-ink"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden overflow-hidden border-t border-pasha-line"
            >
              <div className="flex flex-col gap-4 px-4 sm:px-8 py-6">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="text-lg font-semibold text-pasha-ink"
                  >
                    {link.label}
                  </Link>
                ))}
                <a
                  href={PASHA_FACEBOOK}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2.5 text-lg font-semibold text-pasha-ink"
                >
                  <FacebookGlyph className="h-4 w-4 text-pasha-red" />
                  Community
                </a>
                <PillButton href="/apply" variant="solid" dot={false} className="w-fit py-3 px-6 text-base font-semibold">
                  List your startup
                </PillButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
