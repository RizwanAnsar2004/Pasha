"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PashaLogo } from "@/components/PashaLogo";
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
  Send,
  History,
  ChevronLeft,
  Menu,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin",                      label: "Overview",            icon: LayoutDashboard },
  { href: "/admin/submissions",          label: "Submissions",         icon: Inbox },
  { href: "/admin/databank",             label: "Data Bank",           icon: Database },
  { href: "/admin/featured-startups",    label: "Featured Startups",   icon: Star },
  { href: "/admin/events",               label: "Events",              icon: CalendarDays },
  { href: "/admin/committee-activity",   label: "Committee Activity",  icon: Activity },
  { href: "/admin/committee-management", label: "Committee Mgmt",      icon: Users },
  { href: "/admin/forms",                label: "Form Builder",        icon: FileCode2 },
  { href: "/admin/option-lists",         label: "Option Lists",        icon: List },
  { href: "/admin/email-templates",      label: "Email Templates",     icon: Mail },
  { href: "/admin/email-broadcast",      label: "Send Email",          icon: Send },
  { href: "/admin/email-log",            label: "Email Log",           icon: History },
];

export function AdminSidebar({ userMenu }: { userMenu: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-slate-200/80 shadow-[1px_0_0_0_rgba(0,0,0,0.03)] transition-all duration-300 ease-in-out overflow-x-hidden",
          open ? "w-60" : "w-[68px]"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center h-16 px-3 border-b border-slate-100 shrink-0 transition-all duration-300",
          open ? "justify-between" : "justify-center"
        )}>
          {/* Logo — hidden when collapsed */}
          <div className={cn(
            "overflow-hidden transition-all duration-300",
            open ? "opacity-100 w-[84px]" : "opacity-0 w-0 pointer-events-none"
          )}>
            <PashaLogo width={84} href="/admin" />
          </div>

          {/* Toggle button */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            title={open ? "Collapse sidebar" : "Expand sidebar"}
          >
            {open ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Section label */}
        <div className={cn(
          "px-4 overflow-hidden transition-all duration-200",
          open ? "opacity-100 max-h-10 pt-5 pb-2" : "opacity-0 max-h-0 pt-0 pb-0"
        )}>
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-slate-400">
            Navigation
          </p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2">
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
                title={!open ? item.label : undefined}
                className={cn(
                  "group flex items-center rounded-lg py-2.5 text-sm font-medium transition-all duration-150 mb-0.5 w-full",
                  open ? "gap-3 px-2.5 justify-start" : "justify-center px-0",
                  active
                    ? "bg-pasha-red text-white shadow-sm shadow-pasha-red/25"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon
                  className={cn(
                    "shrink-0 transition-colors",
                    open ? "w-4 h-4" : "w-5 h-5",
                    active ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                {open && (
                  <span className="whitespace-nowrap truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User menu at bottom */}
        <div className={cn(
          "shrink-0 border-t border-slate-100 p-3 flex",
          open ? "justify-start" : "justify-center"
        )}>
          {open ? (
            <div className="w-full min-w-0 overflow-hidden">
              {userMenu}
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-pasha-red/10 grid place-items-center text-[11px] font-bold text-pasha-red ring-1 ring-pasha-red/20">
              N
            </div>
          )}
        </div>
      </aside>

      {/* Spacer */}
      <div className={cn("shrink-0 transition-all duration-300", open ? "w-60" : "w-[68px]")} />
    </>
  );
}
