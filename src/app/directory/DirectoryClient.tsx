"use client";

import { useState, useRef, useEffect, useCallback, useMemo, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Globe, Users, ArrowUpRight, MapPin, Building2, X, LayoutGrid, Rows3, Coins, Calendar, SlidersHorizontal, ChevronDown } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { startupSlug } from "@/lib/utils/slug";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { RichText } from "@/components/ui/RichText";
import { usePageReady } from "@/components/PageReady";
import { EMPTY_OPTION_INDEX, resolveOptionLabel, type OptionIndex } from "@/lib/options/resolve";

export type DirectoryRow = {
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
  company_linkedin?: string | null;
  // Dynamic form answers — used to fall back to range-band text for new records that store revenue / funding as select bands, not numeric columns.
  answers?: Record<string, unknown> | null;
};

// Prefer the user's free text when the stored choice is the "Other"
function resolveOther(value: string | null, custom: unknown): string | null {
  if (value !== "Other") return value;
  return typeof custom === "string" && custom.trim() ? custom.trim() : value;
}

// Resolve a stored band code to a short label (drops the "/ year" suffix and skips non-informative values).
function bandLabel(code: unknown, map: Record<string, string>): string | null {
  if (typeof code !== "string" || !code || code === "na") return null;
  const label = map[code];
  if (!label) return null;
  return label.replace(/\s*\/\s*(year|month)$/i, "").trim();
}

// Internal alias so the existing presentational components keep using `Row`.
type Row = DirectoryRow;

// Filter state — the server owns this (read from the URL); the client only writes back to the URL when a control changes.
export type FilterOption = { value: string; label: string };

// Display label for a filter value, resolving option ids before falling back to the raw value.
function labelOf(options: FilterOption[], value: string, index: OptionIndex, type: string): string {
  return options.find((o) => o.value === value)?.label ?? resolveOptionLabel(index, type, value) ?? value;
}

export type DirectoryFilters = {
  q: string;
  sector: string; // "all" or a sector value
  city: string; // "all" or a city value
  stage: string; // "all" or a product_stage value
  verified: boolean;
  womenLed: boolean;
  hiring: boolean;
  fundraising: boolean;
  sort: string; // "featured" | "az" | "newest" | "oldest"
};

// Small directory badge pills (women-led / hiring / fundraising).
const NEUTRAL_BADGE_CLS = "bg-pasha-ink/[0.05] text-pasha-ink/65 border-pasha-ink/10";
const DIR_BADGE: Record<"women_led" | "hiring" | "fundraising", { label: string; cls: string }> = {
  women_led: { label: "Women-led", cls: NEUTRAL_BADGE_CLS },
  hiring: { label: "Hiring", cls: NEUTRAL_BADGE_CLS },
  fundraising: { label: "Fundraising", cls: NEUTRAL_BADGE_CLS },
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
function clean(s?: string | null): string | null {
  if (!s) return null;
  const v = String(s).trim();
  if (!v || v.toUpperCase() === "NULL" || v === "—") return null;
  return v;
}

// business_types is a "|"/";"/","-delimited multi-select string (e.g.
function splitMulti(v?: string | null): string[] {
  if (!v) return [];
  return String(v)
    .split(/[|;,]+/)
    .map((s) => s.trim())
    .filter((s) => s && s.toUpperCase() !== "NULL");
}

// Inline brand glyph — lucide 1.x dropped brand icons, so LinkedIn is kept as a local SVG (same pattern as the detail page's LinkedInGlyph).
function LinkedInGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M20.45 20.45h-3.55v-5.56c0-1.32-.03-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.65H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.61 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 110-4.13 2.06 2.06 0 010 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
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

// Revenue values are PKR in the source data.
function formatPKR(n: number | null | undefined): string | null {
  if (!n || n <= 0) return null;
  if (n >= 1_00_00_00_000) return `Rs ${(n / 1_00_00_00_000).toFixed(1)} bn`;
  if (n >= 10_000_000) return `Rs ${(n / 10_000_000).toFixed(1)} cr`;
  if (n >= 100_000) return `Rs ${(n / 100_000).toFixed(1)} lac`;
  return `Rs ${n.toLocaleString("en-PK")}`;
}

// All logos are self-hosted on our Supabase Storage bucket.
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

// Sector theme — bundle stripe / badge / logo-bg colours so each industry has a consistent identity across the entire card.
type SectorTheme = {
  stripe: string;   // top accent bar
  badge: string;    // sector pill
  logoBg: string;   // fallback initials avatar background
  logoText: string; // fallback initials text colour
  gradient: string; // subtle background tint for the header section
};

const DEFAULT_THEME: SectorTheme = {
  stripe: "bg-gradient-to-r from-pasha-red to-pasha-red-light",
  badge: "bg-pasha-red/[0.07] text-pasha-red border-pasha-red/10",
  logoBg: "bg-gradient-to-br from-pasha-stone to-pasha-line/40",
  logoText: "text-pasha-ink",
  gradient: "from-pasha-stone/30",
};

// Cycling pastel identities (mirrors the accent palette used across the site's bento cards) so cards in a page of results read as visually distinct.
const ACCENT_THEMES: SectorTheme[] = [
  { stripe: "bg-gradient-to-r from-accent-coral to-accent-coral", badge: "bg-accent-coral/[0.12] text-[#a64043] border-accent-coral/20", logoBg: "bg-accent-coral/[0.18]", logoText: "text-[#a64043]", gradient: "from-accent-coral/[0.08]" },
  { stripe: "bg-gradient-to-r from-accent-yellow to-accent-yellow", badge: "bg-accent-yellow/[0.18] text-[#8a6200] border-accent-yellow/25", logoBg: "bg-accent-yellow/[0.22]", logoText: "text-[#8a6200]", gradient: "from-accent-yellow/[0.10]" },
  { stripe: "bg-gradient-to-r from-accent-green to-accent-green", badge: "bg-accent-green/[0.14] text-[#267c5a] border-accent-green/20", logoBg: "bg-accent-green/[0.18]", logoText: "text-[#267c5a]", gradient: "from-accent-green/[0.08]" },
  { stripe: "bg-gradient-to-r from-accent-purple to-accent-purple", badge: "bg-accent-purple/[0.13] text-[#654d88] border-accent-purple/20", logoBg: "bg-accent-purple/[0.18]", logoText: "text-[#654d88]", gradient: "from-accent-purple/[0.08]" },
  { stripe: "bg-gradient-to-r from-accent-teal to-accent-teal", badge: "bg-accent-teal/[0.14] text-[#146c6f] border-accent-teal/20", logoBg: "bg-accent-teal/[0.18]", logoText: "text-[#146c6f]", gradient: "from-accent-teal/[0.08]" },
  { stripe: "bg-gradient-to-r from-pasha-ink to-pasha-ink", badge: "bg-pasha-ink/[0.06] text-pasha-ink/70 border-pasha-ink/15", logoBg: "bg-pasha-ink/10", logoText: "text-pasha-ink", gradient: "from-pasha-ink/[0.04]" },
];

function themeFor(index: number): SectorTheme {
  return ACCENT_THEMES[index % ACCENT_THEMES.length] ?? DEFAULT_THEME;
}

// Compact number formatter for the stats grid (1,200,000 → "1.2M").
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toLocaleString("en-PK");
}

// --------------------------------------------------------------------------- ListCard — horizontal compact card for list-view mode.
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

// --------------------------------------------------------------------------- ListCard — horizontal compact card for list-view mode.
// ─────────────────────────────────────────────────────────────────
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
  const ready = usePageReady();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
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

function PillFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const isActive = value !== "all";
  return (
    <label
      className={cn(
        "flex min-h-[46px] flex-col justify-center rounded-[14px] border px-3.5 py-1.5 transition-colors",
        isActive ? "border-pasha-red/35 bg-pasha-red/[0.04]" : "border-pasha-ink/10 bg-white"
      )}
    >
      <span className="mb-0.5 block text-[9px] font-regular uppercase tracking-[1.5px] text-pasha-muted">
        {label}
      </span>
      <SelectMenu
        value={value}
        onValueChange={onChange}
        aria-label={`Filter by ${label.toLowerCase()}`}
        className={cn(
          "h-auto w-full border-0 bg-transparent p-0 text-sm font-medium",
          isActive ? "text-pasha-red" : "text-pasha-ink"
        )}
        options={options}
      />
    </label>
  );
}

function QuickChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-[34px] items-center rounded-full border px-3.5 text-xs font-semibold transition-colors",
        active
          ? "border-pasha-red bg-pasha-red text-white"
          : "border-pasha-ink/10 bg-white text-pasha-ink/65 hover:border-pasha-red/30 hover:text-pasha-ink"
      )}
    >
      {children}
    </button>
  );
}

function ActiveChip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex min-h-[34px] items-center gap-2 rounded-full bg-pasha-ink px-3.5 text-xs font-semibold text-white hover:bg-pasha-red transition-colors max-w-xs"
    >
      <span className="truncate">{children}</span>
      <X className="h-3 w-3 shrink-0 opacity-70 group-hover:opacity-100" />
    </button>
  );
}

// --------------------------------------------------------------------------- ListCard — horizontal compact card for list-view mode.
type ListCardProps = {
  row: Row;
  index: number;
  detailHref: string;
  tagline: string | null;
  sectorLabel: string | null;
  city: string | null;
  website: string | null;
  logoUrl: string | null;
  raised: string | null;
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
  website,
  logoUrl,
  raised,
  customers,
  theme,
}: ListCardProps) {
  const ready = usePageReady();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{
        duration: 0.35,
        delay: Math.min((index % PAGE_SIZE) * 0.015, 0.25),
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ x: 2 }}
      className="group relative rounded-[22px] bg-[#f8f6f2] border border-pasha-ink/10 hover:border-pasha-ink/20 hover:shadow-[0_18px_40px_rgba(23,23,23,0.09)] transition-all duration-300 overflow-hidden"
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
        className="absolute inset-0 z-10 rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pasha-red/30"
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
          {/* Team Size / headcount removed from public view (backend-only). */}
          <ListStat
            icon={Coins}
            value={raised}
            label="Raised"
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

const PAGE_SIZE = 12;

export function DirectoryClient({
  rows,
  total,
  totalAll,
  sectors,
  cities,
  stages,
  fundingBands,
  optionIndex = EMPTY_OPTION_INDEX,
  filters,
  page,
  pageSize = PAGE_SIZE,
}: {
  rows: Row[];
  // Total rows matching the active filters (for pagination + result count).
  total: number;
  // Unfiltered total (for the "of N" context).
  totalAll: number;
  // Canonical choice lists resolved from the `option_lists` registry — the
  sectors: FilterOption[];
  cities: FilterOption[];
  stages: FilterOption[];
  // FUNDING_AMOUNT_RANGES from the registry — used only to render a stored
  fundingBands: FilterOption[];
  // id→label lookup so a stored option_id renders as text, not a raw UUID.
  optionIndex?: OptionIndex;
  filters: DirectoryFilters;
  page: number;
  pageSize?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // value→label map for the funding range bands, so a card can show a readable
  const raisedBandLabel = useMemo(
    () => Object.fromEntries(fundingBands.map((o) => [o.value, o.label])),
    [fundingBands]
  );

  const [view, setView] = useState<"grid" | "list">("grid");
  // On mobile the filter controls collapse behind a "Filters" toggle; on sm+ they're always visible (this flag only affects the small-screen layout).
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Local mirror of the search box so typing stays instant; it's pushed to the URL (which triggers the server refetch) after a short debounce.
  const [searchInput, setSearchInput] = useState(filters.q);
  // Re-sync the box during render when the URL's q changes from elsewhere (Reset, browser back/forward) — React's recommended pattern over an effect.
  const [prevQ, setPrevQ] = useState(filters.q);
  if (filters.q !== prevQ) {
    setPrevQ(filters.q);
    setSearchInput(filters.q);
  }
  // Hold card/empty-state entrance animations until the intro loader fades.
  const ready = usePageReady();

  // Write a set of param changes to the URL and refetch the page server-side.
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      }
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [router, pathname, searchParams]
  );

  // Debounce the search box → URL.
  useEffect(() => {
    const next = searchInput.trim();
    if (next === filters.q) return;
    const t = setTimeout(() => {
      updateParams({ q: next || null, page: null });
    }, 400);
    return () => clearTimeout(t);
    // updateParams is stable per searchParams; filters.q guard avoids loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const hasFilters =
    !!filters.q ||
    filters.sector !== "all" ||
    filters.city !== "all" ||
    filters.stage !== "all" ||
    filters.verified ||
    filters.womenLed ||
    filters.hiring ||
    filters.fundraising;

  // Count of active filters (search excluded — it has its own always-visible box) for the mobile "Filters" toggle badge.
  const activeFilterCount = [
    filters.sector !== "all",
    filters.city !== "all",
    filters.stage !== "all",
    filters.verified,
    filters.womenLed,
    filters.hiring,
    filters.fundraising,
  ].filter(Boolean).length;

  // Scroll to top of listing when the page changes.
  const gridRef = useRef<HTMLDivElement>(null);
  function goToPage(p: number) {
    updateParams({ page: p > 1 ? String(p) : null });
    setTimeout(() => {
      gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function resetFilters() {
    setSearchInput("");
    startTransition(() => router.push(pathname, { scroll: false }));
  }

  return (
    <>
      {/* ─────────────────────────────────────────────────────── */}
      <div className="sticky top-[112px] z-30 mb-8 rounded-[20px] border border-pasha-ink/10 bg-white/95 backdrop-blur-xl p-3 shadow-[0_22px_60px_rgba(23,23,23,0.1)]">
        {/* Search */}
        <div className="relative flex h-11 items-center gap-2.5 rounded-[14px] border border-pasha-ink/10 bg-pasha-stone px-3.5">
          <Search className="h-4 w-4 shrink-0 text-pasha-ink/45" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by startup, founder, sector or keyword…"
            aria-label="Search startups"
            className="h-full w-full min-w-0 bg-transparent text-sm placeholder:text-pasha-ink/40 focus-visible:outline-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pasha-ink/10 text-pasha-ink/60 hover:bg-pasha-ink hover:text-white transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Mobile "Filters" toggle — collapses the controls below into a */}
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          className="mt-2 flex sm:hidden w-full items-center justify-between rounded-[14px] border border-pasha-ink/10 bg-white px-4 h-11 text-sm font-bold text-pasha-ink"
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-pasha-red px-1.5 text-[11px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-pasha-ink/50 transition-transform", filtersOpen && "rotate-180")} />
        </button>

        {/* Collapsible filter controls — always visible on sm+, toggled on mobile. */}
        <div className={cn("sm:block", filtersOpen ? "block" : "hidden")}>
        {/* Dropdown filter row */}
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto] gap-2">
          <PillFilter
            label="Sector"
            value={filters.sector}
            onChange={(v) => updateParams({ sector: v === "all" ? null : v, page: null })}
            options={[{ value: "all", label: "All sectors" }, ...sectors]}
          />
          <PillFilter
            label="Location"
            value={filters.city}
            onChange={(v) => updateParams({ city: v === "all" ? null : v, page: null })}
            options={[{ value: "all", label: "All cities" }, ...cities]}
          />
          <PillFilter
            label="Stage"
            value={filters.stage}
            onChange={(v) => updateParams({ stage: v === "all" ? null : v, page: null })}
            options={[{ value: "all", label: "All stages" }, ...stages]}
          />
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasFilters}
            className={cn(
              "min-h-[46px] rounded-[14px] border px-4 text-sm font-bold transition-colors",
              hasFilters
                ? "border-pasha-ink bg-pasha-ink text-white hover:bg-pasha-red hover:border-pasha-red"
                : "border-pasha-ink/10 bg-white text-pasha-ink/30 cursor-not-allowed"
            )}
          >
            Clear filters
          </button>
        </div>

        {/* Quick filter chips */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2.5 px-0.5">
          <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-pasha-muted">Quick filters</span>
          <div className="flex flex-wrap gap-1.5">
            <QuickChip active={filters.verified} onClick={() => updateParams({ verified: filters.verified ? null : "1", page: null })}>
              Verified
            </QuickChip>
            <QuickChip active={filters.womenLed} onClick={() => updateParams({ women_led: filters.womenLed ? null : "1", page: null })}>
              Women-led
            </QuickChip>
            <QuickChip active={filters.hiring} onClick={() => updateParams({ hiring: filters.hiring ? null : "1", page: null })}>
              Hiring
            </QuickChip>
            <QuickChip active={filters.fundraising} onClick={() => updateParams({ fundraising: filters.fundraising ? null : "1", page: null })}>
              Fundraising
            </QuickChip>
          </div>
        </div>
        </div>
      </div>

      {/* ─── Results toolbar — count + sort + view toggle ──── */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-baseline gap-2.5">
          <strong className="font-serif text-2xl font-bold text-pasha-ink leading-none tabular-nums">
            {total.toLocaleString()}
          </strong>
          <span className="text-sm text-pasha-muted">
            {total === 1 ? "startup" : "startups"}
            {total !== totalAll && <> shown from {totalAll.toLocaleString()} indexed profiles</>}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <SelectMenu
              value={filters.sort}
              onValueChange={(v) => updateParams({ sort: v === "featured" ? null : v, page: null })}
              aria-label="Sort startups"
              className="h-11 min-w-[150px] rounded-[14px] border-pasha-ink/10 bg-white text-sm font-semibold text-pasha-ink"
              options={[
                { value: "featured", label: "Sort: Featured" },
                { value: "az", label: "Sort: Name A–Z" },
                { value: "newest", label: "Sort: Newest founded" },
                { value: "oldest", label: "Sort: Oldest founded" },
              ]}
            />
          </div>
          <div className="flex items-center gap-1 rounded-2xl bg-pasha-ink/[0.06] p-1">
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              className={cn(
                "h-9 w-9 grid place-items-center rounded-[13px] transition-all",
                view === "grid" ? "bg-pasha-ink text-white shadow-sm" : "text-pasha-ink/50 hover:text-pasha-ink"
              )}
            >
              <LayoutGrid className="w-4 h-4" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label="List view"
              aria-pressed={view === "list"}
              className={cn(
                "h-9 w-9 grid place-items-center rounded-[13px] transition-all",
                view === "list" ? "bg-pasha-ink text-white shadow-sm" : "text-pasha-ink/50 hover:text-pasha-ink"
              )}
            >
              <Rows3 className="w-4 h-4" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex items-center gap-2 flex-wrap -mt-3 mb-6">
          {filters.sector !== "all" && (
            <ActiveChip onClick={() => updateParams({ sector: null, page: null })}>
              Sector: {labelOf(sectors, filters.sector, optionIndex, "SECTORS")}
            </ActiveChip>
          )}
          {filters.city !== "all" && (
            <ActiveChip onClick={() => updateParams({ city: null, page: null })}>
              Location: {labelOf(cities, filters.city, optionIndex, "HQ_CITIES")}
            </ActiveChip>
          )}
          {filters.stage !== "all" && (
            <ActiveChip onClick={() => updateParams({ stage: null, page: null })}>
              Stage: {labelOf(stages, filters.stage, optionIndex, "STAGES")}
            </ActiveChip>
          )}
          {filters.q && (
            <ActiveChip
              onClick={() => {
                setSearchInput("");
                updateParams({ q: null, page: null });
              }}
            >
              &ldquo;{filters.q}&rdquo;
            </ActiveChip>
          )}
        </div>
      )}

      {/* ── Cards container — grid OR list view ── */}
      <div
        ref={gridRef}
        className={cn(
          "transition-opacity duration-200",
          isPending && "opacity-50 pointer-events-none",
          view === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            : "flex flex-col gap-3"
        )}
      >
        {rows.map((r, i) => {
          const tagline = clean(r.tagline);
          // "Other" is a placeholder — show the free text the user actually
          const sectorLabel = resolveOther(
            resolveOptionLabel(optionIndex, "SECTORS", clean(r.primary_industry)),
            (r.answers as Record<string, unknown> | null)?.primary_sector_other
          );
          const city = resolveOptionLabel(optionIndex, "HQ_CITIES", clean(r.city));
          const website = isSafeUrl(r.website) ? r.website : null;
          const logoUrl = safeLogoUrl(r.logo_url);

          const detailHref = `/directory/${startupSlug(r.startup_name, r.id)}`;
          const theme = themeFor(i);
          const sequence = String((page - 1) * pageSize + i + 1).padStart(2, "0");
          const customers = r.number_of_customers && r.number_of_customers > 0
            ? r.number_of_customers : null;
          const investment = r.investment_raised && r.investment_raised >= 100_000
            ? formatPKR(r.investment_raised) : null;
          const foundedYear = r.founded_date
            ? new Date(r.founded_date).getFullYear() : null;
          const displayTagline = clean(r.tagline) ?? clean(r.startup_idea);

          // For new records revenue / raised come in as form select-bands (not numeric columns), so fall back to the readable range text.
          const a = (r.answers ?? {}) as Record<string, unknown>;
          const raisedDisplay = investment
            ? investment.replace("Rs ", "")
            : bandLabel(a.total_funding_raised, raisedBandLabel);
          const productStage = resolveOptionLabel(optionIndex, "STAGES", clean(r.product_stage));
          const teamSize = r.total_employees && r.total_employees > 0 ? compact(r.total_employees) : null;
          const businessModel = splitMulti(r.business_types).join(" · ") || null;
          const linkedin = isSafeUrl(r.company_linkedin) ? r.company_linkedin : null;
          // Card facts row — Stage / Team size / Business model, in that order.
          const statItems = (
            [
              productStage && { label: "Stage", value: productStage },
              teamSize && { label: "Team size", value: teamSize },
              businessModel && { label: "Business model", value: businessModel },
            ].filter(Boolean) as { label: string; value: string }[]
          ).slice(0, 3);

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
                website={website}
                logoUrl={logoUrl}
                raised={raisedDisplay}
                customers={customers}
                theme={theme}
              />
            );
          }

          // ─────────── GRID VIEW ───────────
          return (
            <motion.article
              key={r.id}
              initial={{ opacity: 0, y: 20 }}
              animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.45, delay: Math.min((i % PAGE_SIZE) * 0.025, 0.3), ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6 }}
              className="group relative flex min-h-[300px] flex-col overflow-hidden rounded-[22px] border border-pasha-ink/10 bg-white p-5 transition-shadow duration-300 hover:shadow-[0_26px_58px_rgba(23,23,23,0.09)]"
            >
              {/* Top accent stripe */}
              <span aria-hidden className={cn("absolute inset-x-0 top-0 h-[4px]", theme.stripe)} />
              <span className="absolute top-4 right-5 font-mono text-[11px] font-bold tracking-[1.5px] text-pasha-ink/35">
                {sequence}
              </span>

              <Link
                href={detailHref}
                aria-label={`View ${r.startup_name} details`}
                className="absolute inset-0 z-10 rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pasha-red/30"
              />

              {/* Head — logo + title + category */}
              <div className="relative z-20 pointer-events-none flex items-start gap-3">
                <div
                  className={cn(
                    "grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[15px] text-sm font-bold",
                    logoUrl ? "bg-white" : `${theme.logoBg} ${theme.logoText}`
                  )}
                >
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                  ) : (
                    <span aria-hidden>{initials(r.startup_name)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <h3 className="min-w-0 truncate font-serif text-[1.1rem] font-semibold leading-tight tracking-tight text-pasha-ink">
                      {r.startup_name}
                    </h3>
                    {r.pasha_verified && (
                      <span className="pointer-events-auto shrink-0">
                        <VerifiedBadge size="sm" />
                      </span>
                    )}
                  </div>
                  {sectorLabel && (
                    <span
                      className={cn(
                        "mt-1.5 inline-flex max-w-full items-center truncate rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[1px]",
                        theme.badge
                      )}
                    >
                      {sectorLabel}
                    </span>
                  )}
                </div>
              </div>

              {/* Hairline divider */}
              <div className="relative z-20 mt-3 border-t border-pasha-ink/[0.07]" />

              {/* Meta row */}
              {(city || foundedYear) && (
                <div className="relative z-20 pointer-events-none mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-pasha-ink/50">
                  {city && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin aria-hidden className="h-3 w-3 text-pasha-red" />
                      {city}
                    </span>
                  )}
                  {foundedYear && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar aria-hidden className="h-3 w-3 text-pasha-red" />
                      Founded {foundedYear}
                    </span>
                  )}
                </div>
              )}

              {/* About */}
              <div className="relative z-20 pointer-events-none mt-2.5">
                {displayTagline ? (
                  <RichText inline value={displayTagline} className="text-[13px] leading-relaxed text-pasha-ink/60 line-clamp-2" />
                ) : (
                  <p className="text-[12px] leading-relaxed text-pasha-ink/40 italic">No description available</p>
                )}
              </div>

              {/* §13 directory badges */}
              <DirectoryBadges r={r} className="relative z-20 pointer-events-none mt-2.5" />

              {/* Facts row — Stage / Team size / Business model */}
              {statItems.length > 0 && (
                <div
                  className={cn(
                    "relative z-20 pointer-events-none mt-auto grid divide-x divide-pasha-ink/[0.07] rounded-[12px] bg-pasha-stone/60 py-2.5",
                    statItems.length >= 3 ? "grid-cols-3" : statItems.length === 2 ? "grid-cols-2" : "grid-cols-1"
                  )}
                >
                  {statItems.map((s, si) => (
                    <div key={si} className="px-3">
                      <small className="block text-[8px] font-medium uppercase tracking-[1px] text-pasha-muted mb-0.5">{s.label}</small>
                      <strong className="block truncate text-[10px] text-pasha-ink">{s.value}</strong>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer icon actions */}
              <div className={cn("relative z-20 flex items-center justify-between gap-2", statItems.length === 0 ? "mt-auto pt-3 border-t border-pasha-ink/10" : "mt-2.5")}>
                <div className="flex items-center gap-2">
                  {website ? (
                    <a
                      href={website.startsWith("http") ? website : `https://${website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Visit ${r.startup_name} website`}
                      title="Website"
                      className="relative z-30 grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-pasha-ink/10 bg-white text-pasha-ink transition-colors hover:bg-pasha-red hover:text-white hover:border-pasha-red"
                    >
                      <Globe className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                  {linkedin ? (
                    <a
                      href={linkedin.startsWith("http") ? linkedin : `https://${linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`${r.startup_name} on LinkedIn`}
                      title="LinkedIn"
                      className="relative z-30 grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-pasha-ink/10 bg-white text-pasha-ink transition-colors hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2]"
                    >
                      <LinkedInGlyph className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
                <Link
                  href={detailHref}
                  aria-label={`Open ${r.startup_name} profile`}
                  title="Open profile"
                  className="relative z-30 grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-pasha-ink text-white transition-colors hover:bg-pasha-red"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPage={goToPage}
        />
      )}

      {/* Empty state */}
      {total === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-[26px] border border-pasha-ink/10 bg-[#f8f6f2] p-12 text-center"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-10 -right-6 select-none font-serif font-black leading-none text-pasha-ink/[0.03]"
            style={{ fontSize: "clamp(8rem,16vw,14rem)" }}
          >
            @
          </span>
          <div className="relative mx-auto w-14 h-14 rounded-2xl bg-white border border-pasha-ink/10 grid place-items-center mb-4">
            <Search className="w-6 h-6 text-pasha-muted" strokeWidth={1.5} />
          </div>
          <h3 className="relative font-serif text-xl text-pasha-ink">
            No startups match those filters
          </h3>
          <p className="relative mt-2 text-sm text-pasha-muted max-w-sm mx-auto leading-relaxed">
            Try a different sector or clear your search to see all{" "}
            {totalAll.toLocaleString()} indexed startups.
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="relative mt-5 inline-flex items-center gap-2 rounded-full bg-pasha-ink px-5 py-2 text-sm font-medium text-white hover:bg-pasha-red transition-colors"
            >
              Reset filters
            </button>
          )}
        </motion.div>
      )}
    </>
  );
}
