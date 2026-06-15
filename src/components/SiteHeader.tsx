"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PashaLogo } from "./PashaLogo";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/directory", label: "Directory" },
  { href: "/about", label: "About" },
];

export function SiteHeader({ variant = "default" }: { variant?: "default" | "transparent" }) {
  const [open, setOpen] = useState(false);
  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-colors",
        variant === "transparent"
          ? "bg-white/70 backdrop-blur-md border-b border-pasha-line/60"
          : "bg-white border-b border-pasha-line"
      )}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <PashaLogo width={120} priority />
            <span className="hidden md:block h-5 w-px bg-pasha-line" aria-hidden />
            <span className="hidden md:block text-[11px] font-mono uppercase tracking-[2px] text-pasha-muted">
              Startup Community
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-pasha-ink hover:text-pasha-red transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/apply"
              className="inline-flex items-center gap-2 rounded-full bg-pasha-red px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-pasha-red-dark transition-colors"
            >
              Apply to join
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </nav>

          <button
            type="button"
            className="md:hidden rounded p-2 -mr-2 text-pasha-ink"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden"
            >
              <div className="flex flex-col gap-4 py-4 border-t border-pasha-line">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="text-base text-pasha-ink"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/apply"
                  onClick={() => setOpen(false)}
                  className="inline-flex w-fit items-center gap-2 rounded-full bg-pasha-red px-5 py-2 text-sm font-medium text-white"
                >
                  Apply to join
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
