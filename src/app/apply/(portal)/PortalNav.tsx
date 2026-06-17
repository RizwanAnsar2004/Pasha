"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ALL_TABS = [
  { href: "/apply", label: "Overview" },
  { href: "/apply/form", label: "My application" },
];

export function PortalNav({ submitted = false }: { submitted?: boolean }) {
  const pathname = usePathname();
  const tabs = submitted ? ALL_TABS.filter((t) => t.href !== "/apply/form") : ALL_TABS;
  return (
    <nav className="flex items-center gap-1 border-b border-pasha-line">
      {tabs.map((t) => {
        const active =
          t.href === "/apply" ? pathname === "/apply" : pathname?.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "relative px-4 py-3 text-sm transition-colors",
              active ? "text-pasha-ink font-medium" : "text-pasha-muted hover:text-pasha-ink"
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
