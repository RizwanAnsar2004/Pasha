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
  Trash2,
} from "lucide-react";
import { cn, formatNumber, formatCurrency } from "@/lib/utils";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { htmlToText } from "@/lib/sanitize-html";
import { Pagination } from "../_components/Pagination";
import { useListNav } from "../_components/useListNav";
import { ShimmerOverlay } from "../_components/ShimmerOverlay";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";
import { toCsv, downloadCsv, fetchAllForExport } from "@/lib/csv";

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
  // Row queued for deletion — drives the confirm modal (null = closed).
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  // Whenever the server returns a fresh page (URL change), sync the local
  // row state. Without this, optimistic updates would survive page changes.
  // Done during render (not in an effect) per the React "adjust state on prop
  // change" pattern.
  const [prevRows, setPrevRows] = useState(initial.rows);
  if (prevRows !== initial.rows) {
    setPrevRows(initial.rows);
    setRowsState(initial.rows);
  }

  // Debounce search → URL.
  useEffect(() => {
    if (q === initial.filters.q) return;
    const t = setTimeout(() => setParams({ q: q || null, page: 1 }), 300);
    return () => clearTimeout(t);
  }, [q, initial.filters.q, setParams]);

  const sector = initial.filters.sector;
  const outreach = initial.filters.outreach;
  const verifiedFilter = initial.filters.verified as "all" | "yes" | "no";

  // Confirmation is handled by the ConfirmDeleteModal; this runs the delete.
  async function deleteRow(id: string) {
    setPending((p) => ({ ...p, [id]: true }));
    // Optimistic removal; restore on failure.
    const snapshot = rowsState;
    setRowsState((rs) => rs.filter((r) => r.id !== id));
    try {
      const res = await fetch("/api/admin/databank", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        setRowsState(snapshot); // rollback
        const j = await res.json().catch(() => ({}));
        alert(`Failed to delete: ${j.error ?? res.statusText}`);
      }
    } catch (e) {
      setRowsState(snapshot); // rollback
      alert(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
      setConfirmDelete(null);
    }
  }

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

  const [exporting, setExporting] = useState(false);

  // Export every row matching the current filters — not just the page on
  // screen — by re-querying the list API with `all=1`.
  const exportCSV = async () => {
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
    setExporting(true);
    try {
      const data = await fetchAllForExport("/api/admin/databank");
      const allRows = (data.rows as Record<string, unknown>[]) ?? [];
      const csv = toCsv(
        cols,
        allRows.map((r) => cols.map((c) => r[c]))
      );
      downloadCsv(`pasha-databank-${Date.now()}.csv`, csv);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not export CSV.");
    } finally {
      setExporting(false);
    }
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
        <SelectMenu
          value={sector}
          onValueChange={setSectorAndReset}
          aria-label="Filter by sector"
          options={[
            { value: "all", label: "All sectors" },
            ...initial.sectors.map((s) => ({ value: s, label: s })),
          ]}
        />
        <SelectMenu
          value={outreach}
          onValueChange={setOutreachAndReset}
          aria-label="Filter by outreach status"
          options={[
            { value: "all", label: "Any outreach" },
            { value: "not_contacted", label: "Not contacted" },
            { value: "invited", label: "Invited" },
            { value: "responded", label: "Responded" },
            { value: "submitted", label: "Submitted" },
            { value: "declined", label: "Declined" },
          ]}
        />
        <SelectMenu
          value={verifiedFilter}
          onValueChange={(v) => setVerifiedAndReset(v as "all" | "yes" | "no")}
          aria-label="Filter by verified status"
          options={[
            { value: "all", label: "Any verified" },
            { value: "yes", label: "Verified only" },
            { value: "no", label: "Not verified" },
          ]}
        />
        <button
          type="button"
          onClick={exportCSV}
          disabled={exporting}
          className="h-10 inline-flex items-center gap-1.5 rounded-lg border border-pasha-line bg-white px-3.5 text-xs font-medium text-pasha-ink hover:bg-pasha-stone/60 transition-colors disabled:opacity-60"
        >
          {exporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}{" "}
          Export CSV
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
                      {htmlToText(r.tagline) ? (
                        <span className="text-xs text-pasha-muted line-clamp-1">{htmlToText(r.tagline)}</span>
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
                      <button
                        type="button"
                        onClick={() => setConfirmDelete({ id: r.id, name: r.startup_name })}
                        disabled={pending[r.id]}
                        title="Delete this startup"
                        className="inline-flex items-center gap-1 text-[11px] text-pasha-muted hover:text-pasha-red disabled:opacity-50 transition-colors"
                      >
                        {pending[r.id] ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        Delete
                      </button>
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

      <ConfirmDeleteModal
        open={confirmDelete !== null}
        title={confirmDelete ? `Delete “${confirmDelete.name}”?` : ""}
        description="This can’t be undone."
        confirmLabel="Delete"
        busy={confirmDelete ? !!pending[confirmDelete.id] : false}
        onConfirm={() => confirmDelete && deleteRow(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
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
