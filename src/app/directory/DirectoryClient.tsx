"use client";

import { useMemo, useState, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Filter, Globe, Users, TrendingUp, ArrowUpRight, MapPin, Building2, X, LayoutGrid, Rows3, BadgeCheck, Coins, Calendar, Layers } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { startupSlug } from "@/lib/slug";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { RichText, htmlToText } from "@/components/ui/RichText";

type Row = {
  id: string;
  startup_name: string;
  tagline?: string | null;
  primary_industry?: string | null;
  nic_name?: string | null;
  city?: string | null;
  website?: string | null;
  logo_url?: string | null;
  current_revenue?: number | null;
  investment_raised?: number | null;
  number_of_customers?: number | null;
  total_employees?: number | null;
  female_employees?: number | null;
  pasha_verified?: boolean | null;
  women_led?: boolean | null;
  hiring?: boolean | null;
  fundraising?: boolean | null;
  founded_date?: string | null;
  product_stage?: string | null;
  business_types?: string | null;
  incubation_stage?: string | null;
  startup_idea?: string | null;
  jobs_created?: number | null;
  founder_name?: string | null;
  founder_photo_url?: string | null;
  founder_role?: string | null;
};

// Small directory badge pills (women-led / hiring / fundraising). Verified
// keeps its own dedicated <VerifiedBadge>. Mirrors src/lib/badges.ts tones.
const DIR_BADGE: Record<"women_led" | "hiring" | "fundraising", { label: string; cls: string }> = {
  women_led: { label: "Women-led", cls: "bg-pink-50 text-pink-700 border-pink-100" },
  hiring: { label: "Hiring", cls: "bg-sky-50 text-sky-700 border-sky-100" },
  fundraising: { label: "Fundraising", cls: "bg-green-50 text-green-700 border-green-100" },
};

function DirectoryBadges({ r, className }: { r: Row; className?: string }) {
  const keys = (["women_led", "hiring", "fundraising"] as const).filter((k) => r[k]);
  if (keys.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className ?? ""}`}>
      {keys.map((k) => (
        <span
          key={k}
          className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-medium ${DIR_BADGE[k].cls}`}
        >
          {DIR_BADGE[k].label}
        </span>
      ))}
    </div>
  );
}

// Source data sometimes has the literal string "NULL" for missing values.
// Treat these as nullish.
function clean(s?: string | null): string | null {
  if (!s) return null;
  const v = String(s).trim();
  if (!v || v.toUpperCase() === "NULL" || v === "—") return null;
  return v;
}

function isSafeUrl(u?: string | null): u is string {
  if (!u) return false;
  const v = String(u).trim();
  if (!v || v.toUpperCase() === "NULL") return false;
  try {
    const url = new URL(v.startsWith("http") ? v : `https://${v}`);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Revenue values are PKR in the source data. Show as PKR, abbreviated.
function formatPKR(n: number | null | undefined): string | null {
  if (!n || n <= 0) return null;
  if (n >= 1_00_00_00_000) return `Rs ${(n / 1_00_00_00_000).toFixed(1)} bn`;
  if (n >= 10_000_000) return `Rs ${(n / 10_000_000).toFixed(1)} cr`;
  if (n >= 100_000) return `Rs ${(n / 100_000).toFixed(1)} lac`;
  return `Rs ${n.toLocaleString("en-PK")}`;
}

// All logos are self-hosted on our Supabase Storage bucket. Filter the
// literal "NULL" string and gate on http(s) to defend against bad rows.
function safeLogoUrl(url?: string | null): string | null {
  if (!url) return null;
  const v = String(url).trim();
  if (!v || v.toUpperCase() === "NULL") return null;
  try {
    const parsed = new URL(v);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

// Sector theme — bundle stripe / badge / logo-bg colours so each industry
// has a consistent identity across the entire card.
type SectorTheme = {
  stripe: string;   // top accent bar
  badge: string;    // sector pill
  logoBg: string;   // fallback initials avatar background
  logoText: string; // fallback initials text colour
  gradient: string; // subtle background tint for the header section
};

const SECTOR_THEMES: Record<string, SectorTheme> = {
  fintech: {
    stripe: "bg-gradient-to-r from-blue-500 to-cyan-500",
    badge: "bg-blue-50 text-blue-700 border-blue-100",
    logoBg: "bg-gradient-to-br from-blue-50 to-cyan-50",
    logoText: "text-blue-700",
    gradient: "from-blue-50/40",
  },
  agritech: {
    stripe: "bg-gradient-to-r from-green-500 to-emerald-500",
    badge: "bg-green-50 text-green-700 border-green-100",
    logoBg: "bg-gradient-to-br from-green-50 to-emerald-50",
    logoText: "text-green-700",
    gradient: "from-green-50/40",
  },
  health: {
    stripe: "bg-gradient-to-r from-emerald-500 to-teal-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-100",
    logoBg: "bg-gradient-to-br from-emerald-50 to-teal-50",
    logoText: "text-emerald-700",
    gradient: "from-emerald-50/40",
  },
  edtech: {
    stripe: "bg-gradient-to-r from-violet-500 to-purple-500",
    badge: "bg-violet-50 text-violet-700 border-violet-100",
    logoBg: "bg-gradient-to-br from-violet-50 to-purple-50",
    logoText: "text-violet-700",
    gradient: "from-violet-50/40",
  },
  ecommerce: {
    stripe: "bg-gradient-to-r from-orange-500 to-amber-500",
    badge: "bg-orange-50 text-orange-700 border-orange-100",
    logoBg: "bg-gradient-to-br from-orange-50 to-amber-50",
    logoText: "text-orange-700",
    gradient: "from-orange-50/40",
  },
  transport: {
    stripe: "bg-gradient-to-r from-amber-500 to-yellow-500",
    badge: "bg-amber-50 text-amber-700 border-amber-100",
    logoBg: "bg-gradient-to-br from-amber-50 to-yellow-50",
    logoText: "text-amber-700",
    gradient: "from-amber-50/40",
  },
  hr: {
    stripe: "bg-gradient-to-r from-pink-500 to-rose-500",
    badge: "bg-pink-50 text-pink-700 border-pink-100",
    logoBg: "bg-gradient-to-br from-pink-50 to-rose-50",
    logoText: "text-pink-700",
    gradient: "from-pink-50/40",
  },
  saas: {
    stripe: "bg-gradient-to-r from-indigo-500 to-blue-500",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-100",
    logoBg: "bg-gradient-to-br from-indigo-50 to-blue-50",
    logoText: "text-indigo-700",
    gradient: "from-indigo-50/40",
  },
  ai: {
    stripe: "bg-gradient-to-r from-purple-500 to-fuchsia-500",
    badge: "bg-purple-50 text-purple-700 border-purple-100",
    logoBg: "bg-gradient-to-br from-purple-50 to-fuchsia-50",
    logoText: "text-purple-700",
    gradient: "from-purple-50/40",
  },
};

const DEFAULT_THEME: SectorTheme = {
  stripe: "bg-gradient-to-r from-pasha-red to-pasha-red-light",
  badge: "bg-pasha-red/[0.07] text-pasha-red border-pasha-red/10",
  logoBg: "bg-gradient-to-br from-pasha-stone to-pasha-line/40",
  logoText: "text-pasha-ink",
  gradient: "from-pasha-stone/30",
};

function themeFor(label: string | null): SectorTheme {
  if (!label) return DEFAULT_THEME;
  const key = label.toLowerCase();
  if (key.includes("fintech") || key.includes("finance")) return SECTOR_THEMES.fintech;
  if (key.includes("agri")) return SECTOR_THEMES.agritech;
  if (key.includes("health")) return SECTOR_THEMES.health;
  if (key.includes("edtech") || key.includes("education")) return SECTOR_THEMES.edtech;
  if (key.includes("commerce") || key.includes("retail")) return SECTOR_THEMES.ecommerce;
  if (key.includes("transport") || key.includes("logistics") || key.includes("mobility"))
    return SECTOR_THEMES.transport;
  if (key.includes("hr ")) return SECTOR_THEMES.hr;
  if (key.includes("saas")) return SECTOR_THEMES.saas;
  if (key.includes("ai") || key.includes("ml")) return SECTOR_THEMES.ai;
  return DEFAULT_THEME;
}

// Compact number formatter for the stats grid (1,200,000 → "1.2M").
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toLocaleString("en-PK");
}

// ---------------------------------------------------------------------------
// LogoTile — 80px company logo with state-driven fallback. Avoids the broken
// image / alt-text-overflow artefact when an external logo CDN 404s.
// ---------------------------------------------------------------------------
function LogoTile({
  src,
  name,
  themeBg,
  themeText,
}: {
  src?: string | null;
  name: string;
  themeBg: string;
  themeText: string;
}) {
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;

  return (
    <div
      className={cn(
        "w-14 h-14 rounded-xl grid place-items-center text-lg font-bold tracking-tight select-none ring-1 ring-pasha-line shadow-sm overflow-hidden",
        showImage ? "bg-white" : `${themeBg} ${themeText}`
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterDropdown — compact pill-style native select with icon prefix.
// ---------------------------------------------------------------------------
/* ─────────────────────────────────────────────────────────────────
   Pagination — numbered page bar with prev/next and smart ellipsis.
   ───────────────────────────────────────────────────────────────── */
function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  // Build page numbers array with ellipsis markers ("…")
  function getPages(): (number | "…")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "…")[] = [1];
    if (page > 3) pages.push("…");
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) {
      pages.push(p);
    }
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
    return pages;
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mt-12 flex flex-col items-center gap-4"
    >
      {/* Page info */}
      <p className="font-mono text-[11px] uppercase tracking-[1.5px] text-pasha-muted">
        Showing {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()} startups
      </p>

      {/* Page bar */}
      <div className="flex items-center gap-1">
        {/* Prev */}
        <PaginationBtn
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </PaginationBtn>

        {getPages().map((p, i) =>
          p === "…" ? (
            <span
              key={`ellipsis-${i}`}
              className="w-9 h-9 grid place-items-center text-sm text-pasha-muted select-none"
            >
              …
            </span>
          ) : (
            <PaginationBtn
              key={p}
              onClick={() => onPage(p)}
              active={p === page}
              aria-label={`Page ${p}`}
            >
              {p}
            </PaginationBtn>
          )
        )}

        {/* Next */}
        <PaginationBtn
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </PaginationBtn>
      </div>

      {/* Jump to page */}
      {totalPages > 5 && (
        <div className="flex items-center gap-2 text-sm text-pasha-muted">
          <span className="font-mono text-[11px] uppercase tracking-[1.5px]">Go to page</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            defaultValue={page}
            key={page}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = Number((e.target as HTMLInputElement).value);
                if (v >= 1 && v <= totalPages) onPage(v);
              }
            }}
            className="w-16 h-8 rounded-lg border border-pasha-line bg-white px-2 text-center text-sm text-pasha-ink focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="font-mono text-[11px] uppercase tracking-[1.5px]">of {totalPages}</span>
        </div>
      )}
    </motion.div>
  );
}

function PaginationBtn({
  children,
  onClick,
  disabled = false,
  active = false,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      className={cn(
        "w-9 h-9 rounded-xl grid place-items-center text-sm font-medium transition-all duration-200 select-none",
        active
          ? "bg-pasha-ink text-white shadow-sm scale-105"
          : disabled
          ? "text-pasha-muted/40 cursor-not-allowed"
          : "border border-pasha-line bg-white text-pasha-ink hover:bg-pasha-stone hover:border-pasha-ink/20 hover:scale-105"
      )}
    >
      {children}
    </button>
  );
}

function FilterDropdown({
  icon: Icon,
  label,
  value,
  onChange,
  options,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const isActive = value !== "all";
  return (
    <div className="relative">
      <Icon
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none transition-colors",
          isActive ? "text-pasha-red" : "text-pasha-muted"
        )}
      />
      <SelectMenu
        value={value}
        onValueChange={onChange}
        aria-label={`Filter by ${label.toLowerCase()}`}
        className={cn(
          "h-9 pl-8 text-[12.5px] font-medium transition-all",
          isActive
            ? "border-pasha-red/40 text-pasha-red bg-pasha-red/[0.04]"
            : "text-pasha-ink/70 hover:border-pasha-ink/15 hover:text-pasha-ink"
        )}
        options={options.map((o) => ({
          value: o.value,
          label: o.value === "all" ? o.label : `${label}: ${o.label}`,
        }))}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// FancyStat — premium stat block with icon-on-color + big serif number.
// ---------------------------------------------------------------------------
function FancyStat({
  icon: Icon,
  value,
  label,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | null;
  label: string;
  accent: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-0.5 transition-opacity duration-300",
        !value && "opacity-40"
      )}
    >
      <div className="flex items-center gap-1 mb-1">
        <Icon className={cn("w-2.5 h-2.5", accent)} />
        <span className="text-[8px] font-mono uppercase tracking-[1.2px] text-pasha-muted/80 font-semibold">
          {label}
        </span>
      </div>
      <div className="font-serif text-base font-bold text-pasha-ink leading-none tabular-nums">
        {value ?? "—"}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ListCard — horizontal compact card for list-view mode.
// Shows: logo · name+sector+city · tagline · stats · actions
// ---------------------------------------------------------------------------
type ListCardProps = {
  row: Row;
  index: number;
  detailHref: string;
  tagline: string | null;
  sectorLabel: string | null;
  city: string | null;
  nic: string | null;
  website: string | null;
  logoUrl: string | null;
  employees: number | null;
  revenue: string | null;
  customers: number | null;
  theme: SectorTheme;
};

function ListCard({
  row: r,
  index,
  detailHref,
  tagline,
  sectorLabel,
  city,
  nic,
  website,
  logoUrl,
  employees,
  revenue,
  customers,
  theme,
}: ListCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: Math.min((index % PAGE_SIZE) * 0.015, 0.25),
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ x: 2 }}
      className="group relative rounded-2xl bg-white border border-pasha-line/70 hover:border-pasha-ink/15 hover:shadow-[0_8px_24px_-8px_rgba(14,14,16,0.12)] transition-all duration-300 overflow-hidden"
    >
      {/* Left accent line — appears on hover */}
      <span
        aria-hidden
        className={cn(
          "absolute top-0 bottom-0 left-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          theme.stripe
        )}
      />

      <Link
        href={detailHref}
        aria-label={`View ${r.startup_name} details`}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pasha-red/30"
      />

      <div className="relative z-20 pointer-events-none p-4 sm:p-5 flex items-center gap-4 sm:gap-5">
        {/* Logo */}
        <div className="shrink-0 relative pointer-events-none">
          <span
            aria-hidden
            className={cn(
              "absolute -inset-1.5 rounded-2xl blur-md opacity-25 group-hover:opacity-50 transition-opacity duration-500",
              theme.stripe.replace("bg-gradient-to-r", "bg-gradient-to-br")
            )}
          />
          <div className="relative">
            <LogoTile
              src={logoUrl}
              name={r.startup_name}
              themeBg={theme.logoBg}
              themeText={theme.logoText}
            />
          </div>
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1 pointer-events-none">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-serif text-lg sm:text-xl leading-tight text-pasha-ink group-hover:text-pasha-red transition-colors duration-300 tracking-tight truncate">
              {r.startup_name}
            </h3>
            {r.pasha_verified && (
              <span className="pointer-events-auto shrink-0">
                <VerifiedBadge size="sm" />
              </span>
            )}
            {sectorLabel && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-semibold uppercase tracking-[1.5px] border",
                  theme.badge
                )}
              >
                <span className={cn("w-1 h-1 rounded-full", theme.stripe.replace("bg-gradient-to-r", "bg-gradient-to-br"))} />
                {sectorLabel}
              </span>
            )}
          </div>

          {/* Tagline */}
          <RichText
            inline
            value={tagline}
            className="mt-1 text-[13px] text-pasha-muted leading-snug line-clamp-1 max-w-2xl"
          />

          {/* §13 directory badges */}
          <DirectoryBadges r={r} className="mt-1.5" />

          {/* Meta row */}
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-pasha-muted">
            {city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {city}
              </span>
            )}
            {nic && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {nic}
              </span>
            )}
            {r.founder_name && (
              <span className="inline-flex items-center gap-1">
                <Users className="w-3 h-3" />
                {r.founder_name}
              </span>
            )}
          </div>
        </div>

        {/* Stats — visible on lg+ */}
        <div className="hidden lg:flex items-center gap-5 shrink-0 pointer-events-none">
          <ListStat
            icon={Users}
            value={employees ? compact(employees) : null}
            label="Team"
          />
          <ListStat
            icon={TrendingUp}
            value={revenue ? revenue.replace("Rs ", "") : null}
            label="Rev"
          />
          <ListStat
            icon={Building2}
            value={customers ? compact(customers) : null}
            label="Users"
          />
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-2">
          {website && (
            <a
              href={website.startsWith("http") ? website : `https://${website}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Visit ${r.startup_name} website`}
              className="relative z-30 pointer-events-auto hidden sm:grid place-items-center w-9 h-9 rounded-lg border border-pasha-line bg-white text-pasha-muted hover:text-pasha-red hover:border-pasha-red/30 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
            </a>
          )}
          <span className="pointer-events-none inline-flex items-center gap-1.5 rounded-full bg-pasha-ink text-white group-hover:bg-pasha-red px-3.5 py-2 text-[11px] font-medium transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:shadow-pasha-red/25">
            View
            <ArrowUpRight
              aria-hidden
              className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function ListStat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | null;
  label: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <Icon className="w-3 h-3 text-pasha-muted" />
      <span className="font-serif text-sm font-bold text-pasha-ink tabular-nums">
        {value}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-[1.2px] text-pasha-muted/70">
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FounderAvatar — 40px circle with state-driven initial fallback.
// ---------------------------------------------------------------------------
function FounderAvatar({ src, name }: { src?: string | null; name: string }) {
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;

  return (
    <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden ring-2 ring-white shadow-sm bg-pasha-stone grid place-items-center text-[11px] font-semibold text-pasha-muted">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </div>
  );
}

const PAGE_SIZE = 12;

export function DirectoryClient({
  initial,
  initialWomenLedOnly = false,
}: {
  initial: { rows: Row[]; total: number; sectors: string[] };
  initialWomenLedOnly?: boolean;
}) {
  const [q, setQ] = useState("");
  const [sector, setSector] = useState<string>("all");
  const [city, setCity] = useState<string>("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [womenLedOnly, setWomenLedOnly] = useState(initialWomenLedOnly);
  const [hiringOnly, setHiringOnly] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  // Build unique city list from data
  const cities = useMemo(() => {
    const set = new Set<string>();
    initial.rows.forEach((r) => {
      const c = clean(r.city);
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [initial.rows]);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    const out = initial.rows.filter((r) => {
      if (sector !== "all" && r.primary_industry !== sector) return false;
      if (city !== "all" && r.city !== city) return false;
      if (verifiedOnly && !r.pasha_verified) return false;
      if (womenLedOnly && !r.women_led) return false;
      if (hiringOnly && !r.hiring) return false;
      if (!needle) return true;
      const hay = [r.startup_name, htmlToText(r.tagline), r.primary_industry, r.nic_name, r.city, r.founder_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
    return out;
  }, [initial.rows, q, sector, city, verifiedOnly, womenLedOnly, hiringOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const hasFilters =
    q.trim() || sector !== "all" || city !== "all" || verifiedOnly || womenLedOnly || hiringOnly;

  // Scroll to top of listing when page changes
  const gridRef = useRef<HTMLDivElement>(null);
  function goToPage(p: number) {
    setPage(p);
    setTimeout(() => {
      gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  return (
    <>
      {/* ───────────────────────────────────────────────────────
          CONTROL PANEL — search + filters + view toggle (sticky)
          ─────────────────────────────────────────────────────── */}
      <div className="sticky top-16 z-30 -mx-5 sm:-mx-8 px-5 sm:px-8 py-3 mb-8 bg-white/90 backdrop-blur-md border-y border-pasha-line/70">
        {/* Row 1: search + view toggle */}
        <div className="flex items-stretch gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pasha-muted pointer-events-none" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, industry, founder, or incubator…"
              aria-label="Search startups"
              className="h-12 w-full box-border rounded-xl border border-pasha-line bg-white pl-11 pr-10 text-sm placeholder:text-pasha-muted/70 focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15 transition-colors"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md grid place-items-center text-pasha-muted hover:text-pasha-ink hover:bg-pasha-stone transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View toggle — grid / list */}
          <div className="hidden sm:flex items-center rounded-xl border border-pasha-line bg-white p-1 shrink-0">
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              className={cn(
                "h-9 w-9 grid place-items-center rounded-lg transition-all",
                view === "grid"
                  ? "bg-pasha-ink text-white shadow-sm"
                  : "text-pasha-muted hover:text-pasha-ink hover:bg-pasha-stone"
              )}
            >
              <LayoutGrid className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label="List view"
              aria-pressed={view === "list"}
              className={cn(
                "h-9 w-9 grid place-items-center rounded-lg transition-all",
                view === "list"
                  ? "bg-pasha-ink text-white shadow-sm"
                  : "text-pasha-muted hover:text-pasha-ink hover:bg-pasha-stone"
              )}
            >
              <Rows3 className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Row 2: filter pills */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* Sector filter */}
          <FilterDropdown
            icon={Filter}
            label="Sector"
            value={sector}
            onChange={(v) => {
              setSector(v);
              setPage(1);
            }}
            options={[{ value: "all", label: "All sectors" }, ...initial.sectors.map((s) => ({ value: s, label: s }))]}
          />

          {/* City filter */}
          <FilterDropdown
            icon={MapPin}
            label="City"
            value={city}
            onChange={(v) => {
              setCity(v);
              setPage(1);
            }}
            options={[{ value: "all", label: "All cities" }, ...cities.map((c) => ({ value: c, label: c }))]}
          />

          {/* Verified-only toggle */}
          <button
            type="button"
            onClick={() => {
              setVerifiedOnly((v) => !v);
              setPage(1);
            }}
            aria-pressed={verifiedOnly}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-[12.5px] font-medium transition-all",
              verifiedOnly
                ? "border-pasha-red bg-pasha-red text-white shadow-sm"
                : "border-pasha-line bg-white text-pasha-ink/70 hover:border-pasha-red/30 hover:text-pasha-ink"
            )}
          >
            <BadgeCheck className="w-3.5 h-3.5" />
            P@SHA Verified
          </button>

          {/* Women-led toggle */}
          <button
            type="button"
            onClick={() => {
              setWomenLedOnly((v) => !v);
              setPage(1);
            }}
            aria-pressed={womenLedOnly}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-[12.5px] font-medium transition-all",
              womenLedOnly
                ? "border-pink-500 bg-pink-500 text-white shadow-sm"
                : "border-pasha-line bg-white text-pasha-ink/70 hover:border-pink-300 hover:text-pasha-ink"
            )}
          >
            Women-led
          </button>

          {/* Hiring toggle */}
          <button
            type="button"
            onClick={() => {
              setHiringOnly((v) => !v);
              setPage(1);
            }}
            aria-pressed={hiringOnly}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-[12.5px] font-medium transition-all",
              hiringOnly
                ? "border-sky-500 bg-sky-500 text-white shadow-sm"
                : "border-pasha-line bg-white text-pasha-ink/70 hover:border-sky-300 hover:text-pasha-ink"
            )}
          >
            Hiring
          </button>

          {/* Clear all */}
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setSector("all");
                setCity("all");
                setVerifiedOnly(false);
                setWomenLedOnly(false);
                setHiringOnly(false);
              }}
              className="ml-auto inline-flex items-center gap-1.5 h-9 px-3 text-[12.5px] font-medium text-pasha-muted hover:text-pasha-red transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* ─── Meta bar — results count + active-filter chips ──── */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-2xl font-semibold text-pasha-ink leading-none tabular-nums">
            {filtered.length.toLocaleString()}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[1.5px] text-pasha-muted">
            {filtered.length === 1 ? "result" : "results"}
            {filtered.length !== initial.rows.length && (
              <> of {initial.rows.length.toLocaleString()}</>
            )}
          </span>
        </div>

        {/* Active filter chips */}
        {hasFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            {sector !== "all" && (
              <button
                type="button"
                onClick={() => setSector("all")}
                className="group inline-flex items-center gap-1.5 rounded-full bg-pasha-red/[0.07] border border-pasha-red/15 text-pasha-red px-3 py-1 text-[11px] font-medium hover:bg-pasha-red/[0.12] transition-colors"
              >
                <span className="font-mono text-[9px] uppercase tracking-[1.5px] opacity-70">
                  sector:
                </span>
                {sector}
                <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
              </button>
            )}
            {q.trim() && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="group inline-flex items-center gap-1.5 rounded-full bg-pasha-ink/5 border border-pasha-ink/10 text-pasha-ink px-3 py-1 text-[11px] font-medium hover:bg-pasha-ink/10 transition-colors max-w-xs"
              >
                <span className="font-mono text-[9px] uppercase tracking-[1.5px] opacity-60">
                  search:
                </span>
                <span className="truncate">&ldquo;{q.trim()}&rdquo;</span>
                <X className="w-3 h-3 opacity-60 group-hover:opacity-100 shrink-0" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Cards container — grid OR list view ── */}
      <div
        ref={gridRef}
        className={cn(
          view === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            : "flex flex-col gap-3"
        )}
      >
        {visible.map((r, i) => {
          const tagline = clean(r.tagline);
          const sectorLabel = clean(r.primary_industry);
          const nic = clean(r.nic_name);
          const city = clean(r.city);
          const website = isSafeUrl(r.website) ? r.website : null;
          const employees = r.total_employees && r.total_employees > 0 ? r.total_employees : null;
          const revenue = r.current_revenue && r.current_revenue >= 100_000
            ? formatPKR(r.current_revenue) : null;
          const logoUrl = safeLogoUrl(r.logo_url);

          const detailHref = `/directory/${startupSlug(r.startup_name, r.id)}`;
          const theme = themeFor(sectorLabel);
          const customers = r.number_of_customers && r.number_of_customers > 0
            ? r.number_of_customers : null;
          const investment = r.investment_raised && r.investment_raised >= 100_000
            ? formatPKR(r.investment_raised) : null;
          const foundedYear = r.founded_date
            ? new Date(r.founded_date).getFullYear() : null;
          const productStage = clean(r.product_stage);
          const businessType = clean(r.business_types);
          const incubationStage = clean(r.incubation_stage);
          const displayTagline = clean(r.tagline) ?? clean(r.startup_idea);
          const femaleEmployees = r.female_employees && r.female_employees > 0
            ? r.female_employees : null;
          const jobsCreated = r.jobs_created && r.jobs_created > 0
            ? r.jobs_created : null;

          // ─────────── LIST VIEW ───────────
          if (view === "list") {
            return (
              <ListCard
                key={r.id}
                row={r}
                index={i}
                detailHref={detailHref}
                tagline={tagline}
                sectorLabel={sectorLabel}
                city={city}
                nic={nic}
                website={website}
                logoUrl={logoUrl}
                employees={employees}
                revenue={revenue}
                customers={customers}
                theme={theme}
              />
            );
          }

          // ─────────── GRID VIEW ───────────
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: Math.min((i % PAGE_SIZE) * 0.025, 0.35), ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -8 }}
              className="group relative rounded-[20px] bg-white overflow-hidden transition-all duration-500 flex flex-col shadow-[0_4px_16px_-4px_rgba(14,14,16,0.06),0_2px_4px_-2px_rgba(14,14,16,0.04)] hover:shadow-[0_30px_70px_-15px_rgba(14,14,16,0.20),0_10px_20px_-8px_rgba(14,14,16,0.10)]"
            >
              {/* Soft gradient backdrop — always slightly visible, intensifies on hover */}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-0 rounded-[20px] opacity-30 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
                  "bg-gradient-to-br to-transparent",
                  theme.gradient
                )}
              />

              {/* Border (inside the gradient layer) */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-[20px] border border-pasha-line/70 group-hover:border-pasha-ink/15 transition-colors duration-300 pointer-events-none"
              />

              {/* Decorative corner accent — sector-coloured blob in top-right */}
              <span
                aria-hidden
                className={cn(
                  "absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none",
                  theme.stripe.replace("bg-gradient-to-r", "bg-gradient-to-br")
                )}
              />

              {/* Whole-card click target */}
              <Link
                href={detailHref}
                aria-label={`View ${r.startup_name} details`}
                className="absolute inset-0 z-10 rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pasha-red/30"
              />

              {/* Top accent line — clipped by the card's overflow-hidden */}
              <span
                aria-hidden
                className={cn(
                  "absolute top-0 left-0 right-0 h-[3px] w-0 group-hover:w-full transition-all duration-700 ease-out pointer-events-none z-[1]",
                  theme.stripe
                )}
              />

              {/* ───────────────────────────────────────────────
                  HEAD — Logo + name + sector + verified
                  ─────────────────────────────────────────────── */}
              <div className="relative z-20 pointer-events-none px-5 pt-5 pb-4">
                <div className="flex items-start gap-3.5">
                  {/* Logo with sector-tinted glow halo behind */}
                  <div className="shrink-0 relative">
                    {/* Soft glow */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute -inset-2 rounded-3xl blur-lg opacity-30 group-hover:opacity-60 transition-opacity duration-500",
                        theme.stripe.replace("bg-gradient-to-r", "bg-gradient-to-br")
                      )}
                    />
                    <motion.div
                      whileHover={{ rotate: -5, scale: 1.08 }}
                      transition={{ type: "spring", stiffness: 300, damping: 18 }}
                      className="relative"
                    >
                      <LogoTile
                        src={logoUrl}
                        name={r.startup_name}
                        themeBg={theme.logoBg}
                        themeText={theme.logoText}
                      />
                    </motion.div>
                  </div>

                  {/* Name + meta column */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-1.5">
                      <h3 className="flex-1 font-serif text-[20px] leading-tight text-pasha-ink group-hover:text-pasha-red transition-colors duration-300 tracking-tight truncate">
                        {r.startup_name}
                      </h3>
                      {r.pasha_verified && (
                        <span className="pointer-events-auto shrink-0 mt-0.5">
                          <VerifiedBadge size="sm" />
                        </span>
                      )}
                    </div>

                    {/* Sector + business type pills */}
                    {(sectorLabel || businessType) && (
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        {sectorLabel && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-semibold uppercase tracking-[1.5px] border",
                              theme.badge
                            )}
                          >
                            <span className={cn("w-1 h-1 rounded-full", theme.stripe.replace("bg-gradient-to-r", "bg-gradient-to-br"))} />
                            {sectorLabel}
                          </span>
                        )}
                        {businessType && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-mono font-semibold uppercase tracking-[1.5px] border border-pasha-ink/15 text-pasha-ink/50 bg-pasha-ink/[0.03]">
                            {businessType}
                          </span>
                        )}
                      </div>
                    )}

                    {/* §13 directory badges */}
                    <DirectoryBadges r={r} className="mt-2" />

                    {/* Location + meta row */}
                    {(city || nic || foundedYear) && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-pasha-muted">
                        {city && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin aria-hidden className="w-3 h-3" />
                            {city}
                          </span>
                        )}
                        {city && nic && <span className="opacity-30">·</span>}
                        {nic && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 aria-hidden className="w-3 h-3" />
                            {nic}
                          </span>
                        )}
                        {foundedYear && (
                          <>
                            <span className="opacity-30">·</span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar aria-hidden className="w-3 h-3" />
                              Est. {foundedYear}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    {/* Stage + incubation row */}
                    {(productStage || incubationStage) && (
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-pasha-muted">
                        {productStage && (
                          <span className="inline-flex items-center gap-1">
                            <Layers aria-hidden className="w-3 h-3" />
                            {productStage}
                          </span>
                        )}
                        {productStage && incubationStage && <span className="opacity-30">·</span>}
                        {incubationStage && (
                          <span className="truncate max-w-[180px]" title={incubationStage}>
                            {incubationStage}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ───────────────────────────────────────────────
                  TAGLINE — italic serif accent
                  ─────────────────────────────────────────────── */}
              <div className="relative z-20 pointer-events-none px-5 pb-4 flex-1">
                {displayTagline ? (
                  <RichText
                    inline
                    value={displayTagline}
                    className="text-[14px] leading-relaxed line-clamp-3 text-pasha-ink/75"
                  />
                ) : (
                  <p className="text-[14px] leading-relaxed line-clamp-3 text-pasha-ink/75">
                    <span className="italic text-pasha-muted/50">No description available</span>
                  </p>
                )}
              </div>

              {/* ───────────────────────────────────────────────
                  FOUNDER — premium card-within-card
                  ─────────────────────────────────────────────── */}
              {r.founder_name && (
                <div className="relative z-20 pointer-events-none px-5 pb-4">
                  <motion.div
                    whileHover={{ x: 3 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex items-center gap-3 rounded-xl bg-white/80 backdrop-blur-sm border border-pasha-line/70 group-hover:border-pasha-ink/15 group-hover:shadow-sm px-3 py-2.5 transition-all"
                  >
                    <div className="relative">
                      <FounderAvatar src={r.founder_photo_url} name={r.founder_name} />
                      {/* Status dot — indicates active founder */}
                      <span
                        aria-hidden
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-pasha-ink truncate leading-tight">
                        {r.founder_name}
                      </div>
                      {r.founder_role && (
                        <div className="text-[10.5px] text-pasha-muted truncate leading-tight mt-0.5">
                          {r.founder_role}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}

              {/* ───────────────────────────────────────────────
                  STATS — 2×2 grid: Team | Revenue / Investment | Users
                  ─────────────────────────────────────────────── */}
              <div className="relative z-20 pointer-events-none px-5 pb-4">
                  <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-pasha-line/60 group-hover:border-pasha-ink/15 group-hover:shadow-sm p-3 transition-all">
                    <div className="grid grid-cols-2 gap-px">
                      <div className="grid grid-cols-2 col-span-2 divide-x divide-pasha-line/50 border-b border-pasha-line/50 pb-2 mb-2">
                        <FancyStat
                          icon={Users}
                          value={employees ? compact(employees) : null}
                          label="Team"
                          accent={theme.logoText}
                        />
                        <FancyStat
                          icon={TrendingUp}
                          value={revenue ? revenue.replace("Rs ", "") : null}
                          label="Revenue"
                          accent={theme.logoText}
                        />
                      </div>
                      <div className="grid grid-cols-2 col-span-2 divide-x divide-pasha-line/50">
                        <FancyStat
                          icon={Coins}
                          value={investment ? investment.replace("Rs ", "") : null}
                          label="Raised"
                          accent={theme.logoText}
                        />
                        <FancyStat
                          icon={customers ? Building2 : femaleEmployees ? Users : jobsCreated ? Users : Building2}
                          value={customers ? compact(customers) : femaleEmployees ? compact(femaleEmployees) : jobsCreated ? compact(jobsCreated) : null}
                          label={customers ? "Users" : femaleEmployees ? "Women" : jobsCreated ? "Jobs" : "Users"}
                          accent={theme.logoText}
                        />
                      </div>
                    </div>
                  </div>
                </div>

              {/* ───────────────────────────────────────────────
                  FOOTER — website + view CTA
                  ─────────────────────────────────────────────── */}
              <div className="relative z-20 pointer-events-none mt-auto px-5 py-3.5 flex items-center justify-between gap-2 border-t border-pasha-line/50 rounded-b-[20px]">
                {website ? (
                  <a
                    href={website.startsWith("http") ? website : `https://${website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="relative z-30 pointer-events-auto inline-flex items-center gap-1.5 text-[11.5px] text-pasha-muted hover:text-pasha-red transition-colors min-w-0 group/web"
                  >
                    <Globe
                      aria-hidden
                      className="w-3.5 h-3.5 shrink-0 group-hover/web:rotate-[20deg] transition-transform duration-300"
                    />
                    <span className="truncate group-hover/web:underline underline-offset-2">
                      {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </span>
                  </a>
                ) : (
                  <span className="text-[11.5px] text-pasha-muted/50">No website</span>
                )}

                {/* View profile pill */}
                <span className="pointer-events-none inline-flex items-center gap-1.5 rounded-full bg-pasha-ink text-white group-hover:bg-pasha-red px-3 py-1.5 text-[11px] font-medium transition-all duration-300 shrink-0 shadow-sm group-hover:shadow-md group-hover:shadow-pasha-red/25">
                  View profile
                  <ArrowUpRight
                    aria-hidden
                    className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onPage={goToPage}
        />
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-dashed border-pasha-line bg-pasha-stone/30 p-12 text-center"
        >
          <div className="mx-auto w-14 h-14 rounded-2xl bg-white border border-pasha-line grid place-items-center mb-4">
            <Search className="w-6 h-6 text-pasha-muted" strokeWidth={1.5} />
          </div>
          <h3 className="font-serif text-xl text-pasha-ink">
            No startups match those filters
          </h3>
          <p className="mt-2 text-sm text-pasha-muted max-w-sm mx-auto leading-relaxed">
            Try a different sector or clear your search to see all{" "}
            {initial.rows.length.toLocaleString()} indexed startups.
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setSector("all");
              }}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-pasha-ink px-5 py-2 text-sm font-medium text-white hover:bg-pasha-red transition-colors"
            >
              Reset filters
            </button>
          )}
        </motion.div>
      )}
    </>
  );
}
