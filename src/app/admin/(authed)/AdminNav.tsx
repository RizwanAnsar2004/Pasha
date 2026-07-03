"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Inbox,
  Database,
  Star,
  CalendarDays,
  Activity,
  Users,
  FileCode2,
  List,
  Mail,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin",                    label: "Overview",             icon: LayoutDashboard },
  { href: "/admin/submissions",        label: "Submissions",          icon: Inbox },
  { href: "/admin/databank",           label: "Data Bank",            icon: Database },
  { href: "/admin/featured-startups",  label: "Featured Startups",    icon: Star },
  // { href: "/admin/events",             label: "Events",               icon: CalendarDays },
  // { href: "/admin/committee-activity", label: "Committee Activity",   icon: Activity },
  { href: "/admin/committee-management", label: "Committee Management",     icon: Users },
  { href: "/admin/forms",              label: "Form Builder",         icon: FileCode2 },
  { href: "/admin/option-lists",       label: "Option Lists",         icon: List },
  { href: "/admin/email-templates",    label: "Email Templates",      icon: Mail },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
              active
                ? "bg-pasha-red text-white shadow-sm shadow-pasha-red/25"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Icon
              className={cn(
                "w-4 h-4 shrink-0 transition-colors",
                active ? "text-white" : "text-slate-400 group-hover:text-slate-600"
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
