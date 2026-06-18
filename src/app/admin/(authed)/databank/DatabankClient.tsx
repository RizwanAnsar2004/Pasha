"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Mail,
  ExternalLink,
  Download,
  BadgeCheck,
  Loader2,
  Pencil,
} from "lucide-react";
import { cn, formatNumber, formatCurrency } from "@/lib/utils";
import { Pagination } from "../_components/Pagination";
import { useListNav } from "../_components/useListNav";
import { ShimmerOverlay } from "../_components/ShimmerOverlay";

type Row = {
  id: string;
  startup_name: string;
  tagline?: string | null;
  primary_industry?: string | null;
  nic_name?: string | null;
  city?: string | null;
  contact_person?: string | null;
  contact_email?: string | null;
  outreach_status?: string | null;
  current_revenue?: number | null;
  investment_raised?: number | null;
  total_employees?: number | null;
  website?: string | null;
  pasha_verified?: boolean | null;
};

type Filters = { q: string; sector: string; outreach: string; verified: string };

export function DatabankClient({
  initial,
}: {
  initial: {
    rows: Row[];
    total: number;
    sectors: string[];
    page: number;
    pageSize: number;
    filters: Filters;
  };
}) {
  const { isPending, setParams } = useListNav();

  // Local mirror of the search box so typing feels instant; we debounce the
  // URL update to avoid a server round-trip per keystroke.
  const [q, setQ] = useState(initial.filters.q);
  const [rowsState, setRowsState] = useState<Row[]>(initial.rows);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  // Whenever the server returns a fresh page (URL change), sync the local
  // row state. Without this, optimistic updates would survive page changes.
  useEffect(() => {
    setRowsState(initial.rows);
  }, [initial.rows]);

  // Debounce search → URL.
  useEffect(() => {
    if (q === initial.filters.q) return;
    const t = setTimeout(() => setParams({ q: q || null, page: 1 }), 300);
    return () => clearTimeout(t);
  }, [q, initial.filters.q, setParams]);

  const sector = initial.filters.sector;
  const outreach = initial.filters.outreach;
  const verifiedFilter = initial.filters.verified as "all" | "yes" | "no";

  async function toggleVerified(id: string, next: boolean) {
    setPending((p) => ({ ...p, [id]: true }));
    // Optimistic update
    setRowsState((rs) => rs.map((r) => (r.id === id ? { ...r, pasha_verified: next } : r)));
    try {
      const res = await fetch("/api/admin/verify-startup", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, verified: next }),
      });
      if (!res.ok) {
        // Rollback on failure
        setRowsState((rs) => rs.map((r) => (r.id === id ? { ...r, pasha_verified: !next } : r)));
        const j = await res.json().catch(() => ({}));
        alert(`Failed to update verified flag: ${j.error ?? res.statusText}`);
      }
    } catch (e) {
      setRowsState((rs) => rs.map((r) => (r.id === id ? { ...r, pasha_verified: !next } : r)));
      alert(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    }
  }

  // All search/filtering is server-side via URL params. The table renders
  // exactly what the server returned.
  function setQAndReset(v: string) { setQ(v); }
  function setSectorAndReset(v: string) { setParams({ sector: v === "all" ? null : v, page: 1 }); }
  function setOutreachAndReset(v: string) { setParams({ outreach: v === "all" ? null : v, page: 1 }); }
  function setVerifiedAndReset(v: "all" | "yes" | "no") { setParams({ verified: v === "all" ? null : v, page: 1 }); }

  const filtered = rowsState;
  const paginated = filtered;

  const exportCSV = () => {
    const cols = [
      "startup_name",
      "primary_industry",
      "nic_name",
      "contact_person",
      "contact_email",
      "website",
      "current_revenue",
      "investment_raised",
      "total_employees",
      "outreach_status",
    ];
    const lines = [
      cols.join(","),
      ...filtered.map((r) =>
        cols
          .map((c) => {
            const v = (r as unknown as Record<string, unknown>)[c];
            const s = v === null || v === undefined ? "" : String(v);
            return `"${s.replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pasha-databank-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pasha-muted" />
          <input
            value={q}
            onChange={(e) => setQAndReset(e.target.value)}
            placeholder="Search startups…"
            className="h-10 w-full rounded-lg border border-pasha-line bg-white pl-10 pr-4 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15"
          />
        </div>
        <select
          value={sector}
          onChange={(e) => setSectorAndReset(e.target.value)}
          className="h-10 rounded-lg border border-pasha-line bg-white px-3 text-sm focus-visible:outline-none focus-visible:border-pasha-red"
        >
          <option value="all">All sectors</option>
          {initial.sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={outreach}
          onChange={(e) => setOutreachAndReset(e.target.value)}
          className="h-10 rounded-lg border border-pasha-line bg-white px-3 text-sm focus-visible:outline-none focus-visible:border-pasha-red"
        >
          <option value="all">Any outreach</option>
          <option value="not_contacted">Not contacted</option>
          <option value="invited">Invited</option>
          <option value="responded">Responded</option>
          <option value="submitted">Submitted</option>
          <option value="declined">Declined</option>
        </select>
        <select
          value={verifiedFilter}
          onChange={(e) => setVerifiedAndReset(e.target.value as "all" | "yes" | "no")}
          className="h-10 rounded-lg border border-pasha-line bg-white px-3 text-sm focus-visible:outline-none focus-visible:border-pasha-red"
          aria-label="Filter by verified status"
        >
          <option value="all">Any verified</option>
          <option value="yes">Verified only</option>
          <option value="no">Not verified</option>
        </select>
        <button
          type="button"
          onClick={exportCSV}
          className="h-10 inline-flex items-center gap-1.5 rounded-lg border border-pasha-line bg-white px-3.5 text-xs font-medium text-pasha-ink hover:bg-pasha-stone/60 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <span className="font-mono uppercase tracking-[2px] text-pasha-muted">
          {filtered.length} showing · {initial.total} total
        </span>
        <span className="text-pasha-muted">
          · {q.trim().length >= 2 ? "Search results" : `Page ${initial.page}`}
        </span>
      </div>

      <div className="rounded-2xl border border-pasha-line bg-white overflow-hidden relative">
        <ShimmerOverlay active={isPending} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-pasha-stone/40 border-b border-pasha-line">
              <tr className="text-left">
                <Th>Startup</Th>
                <Th>Verified</Th>
                <Th>Sector</Th>
                <Th>Contact</Th>
                <Th>Employees</Th>
                <Th>Revenue (PKR)</Th>
                <Th>Investment</Th>
                <Th>Outreach</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {paginated.map((r) => (
                <tr key={r.id} className="border-b border-pasha-line/60 hover:bg-pasha-stone/40">
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-medium text-pasha-ink inline-flex items-center gap-1">
                        {r.startup_name}
                        {r.pasha_verified && (
                          <BadgeCheck className="w-3.5 h-3.5 text-pasha-red" aria-label="Verified" />
                        )}
                      </span>
                      {r.tagline ? (
                        <span className="text-xs text-pasha-muted line-clamp-1">{r.tagline}</span>
                      ) : null}
                    </div>
                  </Td>
                  <Td>
                    <VerifyToggle
                      verified={!!r.pasha_verified}
                      busy={!!pending[r.id]}
                      onToggle={() => toggleVerified(r.id, !r.pasha_verified)}
                    />
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-pasha-ink">{r.primary_industry ?? "—"}</span>
                      {r.nic_name ? (
                        <span className="text-[10px] font-mono uppercase tracking-[1px] text-pasha-muted">
                          {r.nic_name}
                        </span>
                      ) : null}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-pasha-ink">{r.contact_person ?? "—"}</span>
                      {r.contact_email ? (
                        <a
                          href={`mailto:${r.contact_email}`}
                          className="text-[11px] text-pasha-red hover:underline truncate max-w-[180px]"
                        >
                          {r.contact_email}
                        </a>
                      ) : null}
                    </div>
                  </Td>
                  <Td>
                    <span className="text-xs text-pasha-muted">{formatNumber(r.total_employees) || "—"}</span>
                  </Td>
                  <Td>
                    <span className="text-xs text-pasha-muted">
                      {r.current_revenue ? formatCurrency(r.current_revenue, "PKR") : "—"}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs text-pasha-muted">
                      {r.investment_raised ? formatCurrency(r.investment_raised, "USD") : "—"}
                    </span>
                  </Td>
                  <Td>
                    <OutreachBadge status={r.outreach_status ?? "not_contacted"} />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/databank/${r.id}`}
                        className="inline-flex items-center gap-1 text-[11px] text-pasha-ink hover:text-pasha-red transition-colors"
                        title="Edit this startup"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </Link>
                      {r.contact_email ? (
                        <a
                          href={`mailto:${r.contact_email}`}
                          className="inline-flex items-center gap-1 text-[11px] text-pasha-muted hover:text-pasha-red"
                        >
                          <Mail className="w-3 h-3" /> Email
                        </a>
                      ) : r.website ? (
                        <a
                          href={r.website.startsWith("http") ? r.website : `https://${r.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-pasha-muted hover:text-pasha-red"
                        >
                          <ExternalLink className="w-3 h-3" /> Site
                        </a>
                      ) : null}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          total={initial.total}
          page={initial.page}
          pageSize={initial.pageSize}
          setParams={setParams}
          isPending={isPending}
        />
      </div>
    </div>
  );
}

function DatabankRowShimmer() {
  return (
    <tr className="border-b border-pasha-line/60">
      <Td>
        <div className="space-y-2">
          <div className="h-4 w-36 rounded bg-pasha-stone animate-pulse" />
          <div className="h-3 w-52 rounded bg-pasha-stone/70 animate-pulse" />
        </div>
      </Td>
      <Td>
        <div className="h-6 w-16 rounded-md bg-pasha-stone animate-pulse" />
      </Td>
      <Td>
        <div className="space-y-1.5">
          <div className="h-3 w-24 rounded bg-pasha-stone animate-pulse" />
          <div className="h-2.5 w-16 rounded bg-pasha-stone/70 animate-pulse" />
        </div>
      </Td>
      <Td>
        <div className="space-y-1.5">
          <div className="h-3 w-20 rounded bg-pasha-stone animate-pulse" />
          <div className="h-2.5 w-32 rounded bg-pasha-stone/70 animate-pulse" />
        </div>
      </Td>
      <Td>
        <div className="h-3 w-10 rounded bg-pasha-stone animate-pulse" />
      </Td>
      <Td>
        <div className="h-3 w-20 rounded bg-pasha-stone animate-pulse" />
      </Td>
      <Td>
        <div className="h-3 w-16 rounded bg-pasha-stone animate-pulse" />
      </Td>
      <Td>
        <div className="h-5 w-20 rounded-md bg-pasha-stone animate-pulse" />
      </Td>
      <Td>
        <div className="h-3 w-8 rounded bg-pasha-stone animate-pulse" />
      </Td>
    </tr>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[2px] text-pasha-muted">
      {children}
    </th>
  );
}

function Td({ children }: { children?: React.ReactNode }) {
  return <td className="px-4 py-3">{children}</td>;
}

function VerifyToggle({
  verified,
  busy,
  onToggle,
}: {
  verified: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy}
      aria-pressed={verified}
      title={verified ? "Click to remove P@SHA-verified flag" : "Mark as P@SHA verified"}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-mono uppercase tracking-[1px] transition-colors disabled:opacity-50",
        verified
          ? "bg-pasha-red/10 text-pasha-red hover:bg-pasha-red/15"
          : "bg-pasha-stone/80 text-pasha-muted hover:bg-pasha-stone"
      )}
    >
      {busy ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <BadgeCheck className={cn("w-3 h-3", !verified && "opacity-40")} />
      )}
      {verified ? "Verified" : "Verify"}
    </button>
  );
}

function OutreachBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-[1px]",
        status === "not_contacted" && "bg-pasha-stone/80 text-pasha-ink/70",
        status === "invited" && "bg-tier-listed/10 text-tier-listed",
        status === "responded" && "bg-tier-featured/10 text-tier-featured",
        status === "submitted" && "bg-pasha-red/10 text-pasha-red",
        status === "declined" && "bg-pasha-muted/10 text-pasha-muted"
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}
