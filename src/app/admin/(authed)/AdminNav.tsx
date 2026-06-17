"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/submissions", label: "Submissions" },
   { href: "/admin/databank", label: "Data bank" },
  { href: "/admin/featured-startups", label: "Featured startups" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/committee-activity", label: "Committee activity" },
  { href: "/admin/committee-management", label: "Committee management" },
  { href: "/admin/forms", label: "Form builder" },
  { href: "/admin/option-lists", label: "Option lists" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 border-b border-pasha-line">
      {TABS.map((t) => {
        const active =
          t.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "relative px-4 py-3 text-sm transition-colors",
              active
                ? "text-pasha-ink font-medium"
                : "text-pasha-muted hover:text-pasha-ink"
            )}
          >
            {t.label}
            {active && (
              <span className="absolute inset-x-0 -bottom-px h-[2px] bg-pasha-red rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
