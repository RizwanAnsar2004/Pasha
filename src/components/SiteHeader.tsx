"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PashaLogo } from "./PashaLogo";
import { cn } from "@/lib/utils";
import styles from "./landing/HeroPhotoSlider.module.css";

<<<<<<< HEAD
// Same header everywhere: logo + brand, "Join the Hub" pill, hamburger trigger
// and full-screen menu overlay — ported from the homepage hero so every page
// shares one navigation pattern instead of two different header designs.
const MENU_LINKS = [
  { label: "Home", href: "/" },
  { label: "Directory", href: "/directory" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Join the Hub", href: "/apply" },
=======
const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/directory", label: "Directory" },
  { href: "/contact", label: "Contact" },
>>>>>>> 859b1d9477bfe207aa56e45b3d153a450a7afcb8
];

export function SiteHeader({ variant = "solid" }: { variant?: "solid" | "overlay" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const firstMenuLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const burgerButton = burgerRef.current;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => firstMenuLinkRef.current?.focus(), 80);

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleEscape);
      burgerButton?.focus();
    };
  }, [menuOpen]);

  // Overlay (homepage hero, on top of the photo): dark, translucent, white text.
  const overlayBar = (
    <div className={`${styles["hero-photo-container"]} flex items-center justify-between`}>
      <Link aria-label="PASHA Startup Hub home" className={styles["hero-photo-brand"]} href="/">
        <PashaLogo href={null} width={92} alt="PASHA" className={styles["hero-photo-brand-logo"]} />
        <strong>PASHA Startup Hub</strong>
      </Link>
      <div className={styles["hero-photo-top-actions"]}>
        <Link className={styles["hero-photo-top-cta"]} href="/apply">
          Join the Hub <span aria-hidden="true">→</span>
        </Link>
        <button
          ref={burgerRef}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close section menu" : "Open section menu"}
          className={`${styles["hub-burger"]} ${menuOpen ? styles["is-open"] : ""}`}
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          <span />
          <span />
        </button>
      </div>
    </div>
  );

  // Solid (every other page): light bar, dark ink text — no photo behind it,
  // so the dark overlay treatment read as a flat, heavy block.
  const solidBar = (
    <div className="site-container flex items-center justify-between">
      <Link aria-label="PASHA Startup Hub home" href="/" className="inline-flex items-center gap-3 text-pasha-ink">
        <PashaLogo href={null} width={92} alt="PASHA" />
        <strong className="hidden text-[15px] font-bold tracking-tight sm:inline">PASHA Startup Hub</strong>
      </Link>
      <div className="flex items-center gap-2.5">
        <Link
          href="/apply"
          className="hidden items-center gap-2 rounded-full bg-pasha-red px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-pasha-red-dark sm:inline-flex"
        >
          Join the Hub <span aria-hidden="true">→</span>
        </Link>
        <button
          ref={burgerRef}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close section menu" : "Open section menu"}
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
          className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full border border-pasha-ink/15 bg-white text-pasha-ink transition-all hover:border-pasha-red hover:bg-pasha-red hover:text-white"
        >
          <span
            className={cn(
              "absolute h-[2px] w-5 rounded-full bg-current transition-all duration-300",
              menuOpen ? "translate-y-0 rotate-45" : "-translate-y-[3px]"
            )}
          />
          <span
            className={cn(
              "absolute h-[2px] rounded-full bg-current transition-all duration-300",
              menuOpen ? "w-5 translate-y-0 -rotate-45" : "w-3.5 translate-y-[3px]"
            )}
          />
        </button>
      </div>
    </div>
  );

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Announcement bar */}
      <div className="hidden sm:block bg-pasha-ink text-white/70">
        <div className="site-container">
          <div className="flex items-center justify-between h-9 text-[13px]">
            <span className="font-mono">
              <strong className="text-white">{/* P@SHA */}Startup Hub</strong> · Discover ambitious startups across Pakistan
            </span>
            <Link href="/apply" className="inline-flex items-center gap-1.5 text-white hover:text-pasha-red-light transition-colors">
              Applications are open
              <span aria-hidden>&rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      <div
        aria-hidden={!menuOpen}
        className={`${styles["hub-menu-overlay"]} ${menuOpen ? styles["is-open"] : ""}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) setMenuOpen(false);
        }}
      >
        <button
          aria-label="Close menu"
          className={styles["hub-menu-explicit-close"]}
          onClick={() => setMenuOpen(false)}
          type="button"
        >
          <span>Close</span>
          <span aria-hidden="true" className={styles["hub-menu-close-x"]}>
            ×
          </span>
        </button>

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
                {/* Community link — icon-only so it stays out of the way of the
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
                */}
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

        <nav aria-label="Website sections" className={styles["hub-menu-nav"]}>
          <div className={styles["hub-menu-list"]}>
            {MENU_LINKS.map((link, index) => (
              <Link
                key={link.label}
                ref={index === 0 ? firstMenuLinkRef : undefined}
                className={styles["hub-menu-link"]}
                href={link.href}
                onClick={() => setMenuOpen(false)}
              >
                <strong>{link.label}</strong>
              </Link>
            ))}
          </div>
          <p className={styles["hub-menu-close-note"]}>
            Select a section, press Esc, or use the Close button.
          </p>
        </nav>
      </div>
    </>
  );
}
