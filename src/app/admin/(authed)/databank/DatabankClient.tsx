"use client";

import { useMemo, useState } from "react";
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

const PAGE_SIZE = 100;

export function DatabankClient({
  initial,
}: {
  initial: { rows: Row[]; total: number; sectors: string[] };
}) {
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("all");
  const [outreach, setOutreach] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "yes" | "no">("all");
  const [rowsState, setRowsState] = useState<Row[]>(initial.rows);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);

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

  function setQAndReset(v: string) { setQ(v); setPage(1); }
  function setSectorAndReset(v: string) { setSector(v); setPage(1); }
  function setOutreachAndReset(v: string) { setOutreach(v); setPage(1); }
  function setVerifiedAndReset(v: "all" | "yes" | "no") { setVerifiedFilter(v); setPage(1); }

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    return rowsState.filter((r) => {
      if (sector !== "all" && r.primary_industry !== sector) return false;
      if (outreach !== "all" && r.outreach_status !== outreach) return false;
      if (verifiedFilter === "yes" && !r.pasha_verified) return false;
      if (verifiedFilter === "no" && r.pasha_verified) return false;
      if (!needle) return true;
      return [
        r.startup_name,
        r.tagline,
        r.primary_industry,
        r.contact_person,
        r.contact_email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [rowsState, q, sector, outreach, verifiedFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
          {filtered.length} results · page {page}/{totalPages}
        </span>
        <span className="text-pasha-muted">· Top 200 by revenue loaded</span>
      </div>

      <div className="rounded-2xl border border-pasha-line bg-white overflow-hidden">
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
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1.5 rounded-lg border border-pasha-line bg-white px-4 py-2 text-xs font-medium text-pasha-ink hover:bg-pasha-stone/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          <span className="text-xs text-pasha-muted">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex items-center gap-1.5 rounded-lg border border-pasha-line bg-white px-4 py-2 text-xs font-medium text-pasha-ink hover:bg-pasha-stone/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
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
