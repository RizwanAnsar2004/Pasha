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
  Trophy,
  CalendarDays,
  Activity,
  Users,
  FileCode2,
  List,
  Mail,
  Send,
  History,
  ShieldCheck,
  ChevronLeft,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin",                      label: "Overview",            icon: LayoutDashboard },
  { href: "/admin/submissions",          label: "Submissions",         icon: Inbox },
  { href: "/admin/databank",             label: "Data Bank",           icon: Database },
  { href: "/admin/featured-startups",    label: "Featured Startups",   icon: Star },
  { href: "/admin/awards",               label: "Award Winners",       icon: Trophy },
  // { href: "/admin/events",               label: "Events",              icon: CalendarDays },
  // { href: "/admin/committee-activity",   label: "Committee Activity",  icon: Activity },
  { href: "/admin/committee-management", label: "Committee Management", icon: Users },
  { href: "/admin/forms",                label: "Form Builder",        icon: FileCode2 },
  { href: "/admin/option-lists",         label: "Option Lists",        icon: List },
  { href: "/admin/email-templates",      label: "Email Templates",     icon: Mail },
  { href: "/admin/email-broadcast",      label: "Send Email",          icon: Send },
  { href: "/admin/email-log",            label: "Email Log",           icon: History },
  { href: "/admin/privacy",              label: "Privacy & Terms",     icon: ShieldCheck },
];

/**
 * Admin chrome (sidebar + top bar) with two independent layout modes:
 *  - Desktop (lg+): sidebar is always visible and can collapse between a full
 *    240px panel and a 68px icon rail via `collapsed`. A spacer reserves the
 *    same width so content sits beside it.
 *  - Mobile (<lg): sidebar becomes an off-canvas drawer toggled by `mobileOpen`
 *    (hamburger in the top bar / overlay / nav-link tap). The spacer is hidden
 *    so content uses the full width.
 */
export function AdminShell({
  userMenu,
  children,
}: {
  userMenu: React.ReactNode;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar — off-canvas drawer on mobile, fixed rail on desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-white border-r border-slate-200/80 shadow-[1px_0_0_0_rgba(0,0,0,0.03)] overflow-x-hidden",
          "transform transition-transform duration-300 ease-in-out lg:transition-[width]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
          collapsed ? "lg:w-[68px]" : "lg:w-60"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center h-16 px-3 border-b border-slate-100 shrink-0 transition-all duration-300",
            collapsed ? "justify-between lg:justify-center" : "justify-between"
          )}
        >
          {/* Logo — hidden only when collapsed on desktop */}
          <div
            className={cn(
              "overflow-hidden transition-all duration-300 w-[84px]",
              collapsed && "lg:opacity-0 lg:w-0 lg:pointer-events-none"
            )}
          >
            <PashaLogo width={84} href="/admin" />
          </div>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section label */}
        <div
          className={cn(
            "px-4 pt-5 pb-2 overflow-hidden transition-all duration-200",
            collapsed && "lg:opacity-0 lg:max-h-0 lg:pt-0 lg:pb-0"
          )}
        >
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
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group flex items-center rounded-lg py-2.5 text-sm font-medium transition-all duration-150 mb-0.5 w-full gap-3 px-2.5 justify-start",
                  collapsed && "lg:gap-0 lg:px-0 lg:justify-center",
                  active
                    ? "bg-pasha-red text-white shadow-sm shadow-pasha-red/25"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon
                  className={cn(
                    "shrink-0 transition-colors w-4 h-4",
                    collapsed && "lg:w-5 lg:h-5",
                    active ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                <span
                  className={cn(
                    "whitespace-nowrap truncate",
                    collapsed && "lg:hidden"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User menu at bottom */}
        <div
          className={cn(
            "shrink-0 border-t border-slate-100 p-3 flex justify-start",
            collapsed && "lg:justify-center"
          )}
        >
          <div className={cn("w-full min-w-0 overflow-hidden", collapsed && "lg:hidden")}>
            {userMenu}
          </div>
          {collapsed && (
            <div className="hidden lg:grid w-8 h-8 rounded-full bg-pasha-red/10 place-items-center text-[11px] font-bold text-pasha-red ring-1 ring-pasha-red/20">
              N
            </div>
          )}
        </div>
      </aside>

      {/* Desktop spacer — reserves sidebar width on lg+, absent on mobile */}
      <div
        className={cn(
          "hidden lg:block shrink-0 transition-all duration-300",
          collapsed ? "lg:w-[68px]" : "lg:w-60"
        )}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-16 flex items-center gap-3 bg-white/80 backdrop-blur border-b border-slate-200/70 px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden -ml-1 p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-slate-800">PSEC Admin Panel</span>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
