"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { History, FileSpreadsheet, Loader2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { ENDPOINTS } from "@/lib/api/endpoints";
// import { toCsv, downloadCsv } from "@/lib/utils/csv"; // used only by the commented-out CSV export

type Entry = {
  id: string;
  actor_email: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string | null;
  startup_name: string | null;
};

// action -> human label + tone for the badge.
const ACTION_META: Record<string, { label: string; tone: string }> = {
  "submission.submitted": { label: "Submitted", tone: "bg-sky-50 text-sky-700" },
  "submission.approved": { label: "Approved", tone: "bg-green-600/10 text-green-700" },
  "submission.rejected": { label: "Rejected", tone: "bg-pasha-red/10 text-pasha-red" },
  "submission.needs_update": { label: "Update requested", tone: "bg-amber-50 text-amber-800" },
  "submission.watchlist": { label: "Watchlisted", tone: "bg-amber-50 text-amber-800" },
  "submission.pending": { label: "Pending", tone: "bg-pasha-stone text-pasha-ink/70" },
  "submission.verify": { label: "Verified", tone: "bg-pasha-red/10 text-pasha-red" },
  "submission.unverify": { label: "Unverified", tone: "bg-pasha-stone text-pasha-ink/70" },
  "databank.update": { label: "Databank edited", tone: "bg-sky-50 text-sky-700" },
  "databank.delete": { label: "Databank deleted", tone: "bg-pasha-red/10 text-pasha-red" },
  "databank.verify": { label: "Verified", tone: "bg-pasha-red/10 text-pasha-red" },
  "databank.unverify": { label: "Unverified", tone: "bg-pasha-stone text-pasha-ink/70" },
  "databank.request_edit": { label: "Info requested", tone: "bg-amber-50 text-amber-800" },
  "edit_request.submitted": { label: "Info provided", tone: "bg-green-600/10 text-green-700" },
  "featured.added": { label: "Featured", tone: "bg-amber-100 text-amber-800" },
  "featured.removed": { label: "Unfeatured", tone: "bg-pasha-stone text-pasha-ink/70" },
  "award.added": { label: "Award added", tone: "bg-amber-100 text-amber-800" },
  "award.updated": { label: "Award updated", tone: "bg-amber-50 text-amber-800" },
  "award.removed": { label: "Award removed", tone: "bg-pasha-stone text-pasha-ink/70" },
  "company.claim": { label: "Profile claimed", tone: "bg-sky-50 text-sky-700" },
};
const actionMeta = (a: string) => ACTION_META[a] ?? { label: a, tone: "bg-pasha-stone text-pasha-ink/70" };

const ACTION_OPTIONS = [
  { value: "startup", label: "All startup activity" },
  { value: "all", label: "All actions" },
  ...Object.entries(ACTION_META).map(([value, m]) => ({ value, label: m.label })),
];

const selectClass =
  "rounded-lg border border-pasha-line bg-white px-3 py-2 text-sm text-pasha-ink focus:border-pasha-red focus:outline-none";

// Short, human summary of a payload — used only by the (commented-out) CSV export.
/*
function detailsOf(e: Entry): string {
  const p = e.payload ?? {};
  const bits: string[] = [];
  if (typeof p.title === "string") bits.push(p.title);
  if (p.year) bits.push(String(p.year));
  if (typeof p.tier === "string") bits.push(`tier ${p.tier}`);
  if (p.resubmit === true) bits.push("resubmission");
  if (typeof p.featured_until === "string") bits.push(`until ${p.featured_until.slice(0, 10)}`);
  return bits.join(" · ");
}
*/

function fmtWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}

export function AuditLogClient() {
  const [action, setAction] = useState("startup");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  // const [exporting, setExporting] = useState(false); // CSV export disabled
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  const params = useCallback(
    (extra?: Record<string, string>) => {
      const p = new URLSearchParams();
      if (action) p.set("action", action);
      if (debouncedQ.trim()) p.set("q", debouncedQ.trim());
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      for (const [k, v] of Object.entries(extra ?? {})) p.set(k, v);
      return p;
    },
    [action, debouncedQ, from, to]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const p = params({ page: String(page) });
        const res = await fetch(`${ENDPOINTS.admin.auditLog}?${p.toString()}`, { credentials: "include" });
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? `Failed (${res.status})`);
        const data = await res.json();
        if (cancelled) return;
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
        setPageSize(data.pageSize ?? 50);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [params, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  /* CSV export — disabled (kept for easy re-enable)
  const exportCsv = async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch(`${ENDPOINTS.admin.auditLog}?${params({ all: "1" }).toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const data = await res.json();
      const entries = (data.rows ?? []) as Entry[];
      const csv = toCsv(
        ["When", "Startup", "Action", "By", "Details", "Resource"],
        entries.map((e) => [
          fmtWhen(e.created_at),
          e.startup_name ?? "",
          actionMeta(e.action).label,
          e.actor_email ?? "",
          detailsOf(e),
          `${e.resource_type ?? ""} ${e.resource_id ?? ""}`.trim(),
        ])
      );
      downloadCsv(`pasha-activity-log-${Date.now()}.csv`, csv);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };
  */

  const downloadReport = async () => {
    setReporting(true);
    setError(null);
    try {
      const res = await fetch(`${ENDPOINTS.admin.reportsActivity}?${params().toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? `Report failed (${res.status})`);
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const name = /filename="([^"]+)"/.exec(cd)?.[1] ?? "PASHA_Startup_Activity.xlsx";
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report failed");
    } finally {
      setReporting(false);
    }
  };

  const rangeLabel = useMemo(() => {
    if (total === 0) return "0 events";
    const start = page * pageSize + 1;
    const end = Math.min(total, (page + 1) * pageSize);
    return `${start}–${end} of ${total}`;
  }, [page, pageSize, total]);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-pasha-red/10 grid place-items-center shrink-0">
          <History className="w-5 h-5 text-pasha-red" />
        </div>
        <div>
          <h1 className="font-serif text-2xl tracking-tight text-pasha-ink">Activity Log</h1>
          <p className="mt-0.5 text-sm text-pasha-muted">
            Every step of a startup&apos;s journey — submitted, approved, verified, featured, awarded,
            info requested — in one filterable trail.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pasha-muted" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="Search startup or admin…"
            className={`${selectClass} w-full pl-9`}
          />
        </div>
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(0); }} className={selectClass} aria-label="Filter by action">
          {ACTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} className={selectClass} aria-label="From date" />
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} className={selectClass} aria-label="To date" />
        {/* CSV export disabled
        <button
          type="button"
          onClick={exportCsv}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-lg border border-pasha-line bg-white px-3 py-2 text-sm font-medium text-pasha-ink hover:bg-pasha-stone/60 disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </button>
        */}
        <button
          type="button"
          onClick={downloadReport}
          disabled={reporting}
          className="inline-flex items-center gap-2 rounded-lg bg-pasha-red px-3 py-2 text-sm font-medium text-white hover:bg-pasha-red-dark disabled:opacity-50"
        >
          {reporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          Excel report
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-pasha-red/30 bg-pasha-red/[0.04] px-3 py-2 text-sm text-pasha-red">{error}</p>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-pasha-line bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pasha-line bg-pasha-stone/30 text-left">
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wide text-pasha-muted">When</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wide text-pasha-muted">Startup</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wide text-pasha-muted">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-10 text-center text-pasha-muted"><Loader2 className="inline w-5 h-5 animate-spin" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-10 text-center text-pasha-muted">No activity for these filters.</td></tr>
              ) : (
                rows.map((e) => {
                  const m = actionMeta(e.action);
                  return (
                    <tr key={e.id} className="border-b border-pasha-line/60 last:border-0 hover:bg-pasha-stone/20">
                      <td className="px-4 py-3 whitespace-nowrap text-pasha-muted tabular-nums">{fmtWhen(e.created_at)}</td>
                      <td className="px-4 py-3 font-medium text-pasha-ink">{e.startup_name ?? <span className="text-pasha-muted">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${m.tone}`}>{m.label}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between gap-3 border-t border-pasha-line px-4 py-3">
          <span className="text-xs text-pasha-muted tabular-nums">{rangeLabel}</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-pasha-line bg-white px-3 py-1.5 text-sm text-pasha-ink hover:bg-pasha-stone/60 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-xs text-pasha-muted tabular-nums px-1">{page + 1} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
              disabled={page + 1 >= totalPages || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-pasha-line bg-white px-3 py-1.5 text-sm text-pasha-ink hover:bg-pasha-stone/60 disabled:opacity-40 disabled:pointer-events-none"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
