"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PashaLogo } from "./PashaLogo";
import { cn } from "@/lib/utils";
import styles from "./landing/HeroPhotoSlider.module.css";

// Same header everywhere: logo + brand, "Join the Hub" pill, hamburger trigger
// and full-screen menu overlay — ported from the homepage hero so every page
// shares one navigation pattern instead of two different header designs.
const MENU_LINKS = [
  { label: "Home", href: "/" },
  { label: "Directory", href: "/directory" },
  { label: "Events", href: "/events" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Join the Hub", href: "/apply" },
];

export function SiteHeader({ variant = "solid" }: { variant?: "solid" | "overlay" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const firstMenuLinkRef = useRef<HTMLAnchorElement>(null);
  const pathname = usePathname();

  // Nothing to join once you're already in the applicant portal — drop the CTA
  // from the bar and the entry from the overlay menu.
  const onApply = pathname === "/apply" || pathname?.startsWith("/apply/");
  const menuLinks = onApply ? MENU_LINKS.filter((l) => l.href !== "/apply") : MENU_LINKS;

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
        {!onApply && (
          <Link className={styles["hero-photo-top-cta"]} href="/apply">
            Join the Hub
          </Link>
        )}
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
        {!onApply && (
          <Link
            href="/apply"
            className="hidden items-center gap-2 rounded-full bg-pasha-red px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-pasha-red-dark sm:inline-flex"
          >
            Join the Hub
          </Link>
        )}
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
    <>
      {variant === "overlay" ? (
        <div className="absolute inset-x-0 top-0 z-20 pt-7">{overlayBar}</div>
      ) : (
        <header className="sticky top-0 z-40 w-full bg-white py-4 shadow-[0_2px_16px_rgba(23,23,23,0.08)]">
          {solidBar}
        </header>
      )}

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

        <div className={styles["hub-menu-intro"]}>
          <div>
            <span className={styles["hub-menu-eyebrow"]}>PASHA Startup Hub</span>
            <h2>Explore the Hub.</h2>
            <p>
              Discover startups, understand the Hub, connect with PASHA, or bring your startup into
              Pakistan&apos;s national startup network.
            </p>
          </div>
          <div className={styles["hub-menu-small"]}>
            <span>Connecting Pakistan&apos;s startup ecosystem.</span>
            <span>Navigation</span>
          </div>
        </div>

        <nav aria-label="Website sections" className={styles["hub-menu-nav"]}>
          <div className={styles["hub-menu-list"]}>
            {menuLinks.map((link, index) => (
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
