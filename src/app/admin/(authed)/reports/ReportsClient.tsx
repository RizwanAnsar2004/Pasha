"use client";

import { useState } from "react";
import { Download, Loader2, FileSpreadsheet } from "lucide-react";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { apiErrorMessage } from "@/lib/api/client";

type Sector = { value: string; label: string };

const inputClass =
  "w-full rounded-lg border border-pasha-line bg-white px-3 py-2 text-sm text-pasha-ink focus:border-pasha-red focus:outline-none";
const labelClass = "block text-[11px] font-mono uppercase tracking-[1.5px] text-pasha-muted mb-1";

export function ReportsClient({ sectors }: { sectors: Sector[] }) {
  const [sector, setSector] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setError(null);
    if (from && to && from > to) {
      setError("The start date is after the end date.");
      return;
    }
    const p = new URLSearchParams();
    if (sector !== "all") p.set("sector", sector);
    if (from) p.set("from", from);
    if (to) p.set("to", to);

    setBusy(true);
    try {
      const res = await fetch(`${ENDPOINTS.admin.reportsOverview}?${p.toString()}`, { credentials: "include" });
      if (!res.ok) {
        let msg = `Report failed (${res.status})`;
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch {}
        throw new Error(msg);
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const name = /filename="([^"]+)"/.exec(cd)?.[1] ?? "PASHA_Startup_Report.xlsx";
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      setError(apiErrorMessage(e, "Couldn't generate the report"));
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    setSector("all");
    setFrom("");
    setTo("");
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-pasha-red/10 grid place-items-center shrink-0">
          <FileSpreadsheet className="w-5 h-5 text-pasha-red" />
        </div>
        <div>
          <h1 className="font-serif text-2xl tracking-tight text-pasha-ink">Reports</h1>
          <p className="mt-0.5 text-sm text-pasha-muted">
            One committee-ready Excel: how many startups submitted, how many were approved / rejected / needs-update,
            and the full databank records — all in a single file.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-pasha-line bg-white p-5 sm:p-6">
        <h2 className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-red">Startup report</h2>
        <p className="mt-1 text-sm text-pasha-muted">
          The workbook has an <span className="font-medium text-pasha-ink">Overview</span> dashboard (submissions +
          databank totals), a <span className="font-medium text-pasha-ink">Submissions</span> sheet, and a{" "}
          <span className="font-medium text-pasha-ink">Databank</span> sheet. The date range filters both by their entry
          date.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className={labelClass}>Sector</label>
            <select value={sector} onChange={(e) => setSector(e.target.value)} className={inputClass}>
              <option value="all">All sectors</option>
              {sectors.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Date from</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Date to</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-pasha-red/30 bg-pasha-red/[0.04] px-3 py-2 text-sm text-pasha-red">{error}</p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={download}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-pasha-red px-6 py-2.5 text-sm font-medium text-white shadow-md hover:bg-pasha-red-dark transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {busy ? "Generating…" : "Download Excel report"}
          </button>
          <button
            type="button"
            onClick={clear}
            className="rounded-full border border-pasha-line bg-white px-4 py-2.5 text-sm font-medium text-pasha-ink hover:bg-pasha-stone/60 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
