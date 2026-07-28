import "server-only";
import ExcelJS from "exceljs";
import { formatDate } from "./databank-report.server";

// One submission row, resolved to display labels, for the committee report.
export type SubmissionReportRow = {
  startup_name: string | null;
  founder_name: string | null;
  founder_email: string | null;
  sector: string | null;
  city: string | null;
  tier: string | null;
  score: number | null;
  status: string | null;
  created_at: string | null;
};

export type ReportMeta = { reportDate: string; filterSummary: string };

const RED = "FFC8102E";
const INK = "FF111111";
const MUTED = "FF6B7280";
const STONE = "FFF6F4F2";

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  pending: "Pending",
  needs_update: "Needs update",
  approved: "Approved",
  rejected: "Rejected",
  watchlist: "Watchlist",
};
const statusLabel = (s: string | null): string => (s ? STATUS_LABELS[s] ?? s : "—");

function tally(values: (string | null)[]): [string, number][] {
  const m = new Map<string, number>();
  for (const v of values) {
    const key = v && v.trim() ? v.trim() : "—";
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export async function buildSubmissionsReport(rows: SubmissionReportRow[], meta: ReportMeta): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PSEC Admin Panel";

  const dash = wb.addWorksheet("Committee Dashboard", { views: [{ showGridLines: false }] });
  dash.columns = Array.from({ length: 9 }, () => ({ width: 16 }));

  dash.mergeCells("A1:I1");
  const title = dash.getCell("A1");
  title.value = "P@SHA Startup Hub — Submissions Committee Report";
  title.font = { size: 16, bold: true, color: { argb: RED } };
  title.alignment = { vertical: "middle" };
  dash.getRow(1).height = 26;

  dash.mergeCells("A2:I2");
  const sub = dash.getCell("A2");
  sub.value = `Prepared from PSEC Admin Panel data     •     Report date: ${meta.reportDate}     •     ${meta.filterSummary}`;
  sub.font = { size: 10, color: { argb: MUTED } };

  const total = rows.length;
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const approved = count("approved");
  const pending = count("submitted") + count("pending");
  const needsUpdate = count("needs_update");
  const rejected = count("rejected");

  const kpis: [string, number][] = [
    ["TOTAL REGISTERED", total],
    ["APPROVED", approved],
    ["SUBMITTED (PENDING)", pending],
    ["NEEDS UPDATE", needsUpdate],
    ["REJECTED", rejected],
  ];
  kpis.forEach(([label, value], i) => {
    const col = i + 1;
    const v = dash.getCell(4, col);
    v.value = value;
    v.font = { size: 20, bold: true, color: { argb: RED } };
    v.alignment = { horizontal: "center" };
    const l = dash.getCell(5, col);
    l.value = label;
    l.font = { size: 9, bold: true, color: { argb: MUTED } };
    l.alignment = { horizontal: "center" };
  });

  const renderTable = (
    startRow: number,
    startCol: number,
    heading: string,
    headers: string[],
    body: (string | number)[][]
  ) => {
    const h = dash.getCell(startRow, startCol);
    h.value = heading;
    h.font = { size: 11, bold: true, color: { argb: INK } };
    headers.forEach((label, i) => {
      const c = dash.getCell(startRow + 1, startCol + i);
      c.value = label;
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED } };
      c.alignment = { horizontal: i === 0 ? "left" : "right" };
    });
    body.forEach((r, ri) => {
      r.forEach((cell, ci) => {
        const c = dash.getCell(startRow + 2 + ri, startCol + ci);
        c.value = cell;
        c.alignment = { horizontal: ci === 0 ? "left" : "right" };
        if (ri % 2 === 1) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STONE } };
      });
    });
  };

  const pct = (n: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : "0%");
  const statusTally = tally(rows.map((r) => statusLabel(r.status)));
  renderTable(
    8,
    1,
    "Status breakdown",
    ["Status", "Count", "% of total"],
    statusTally.map(([k, v]) => [k, v, pct(v)])
  );

  const sectorTally = tally(rows.map((r) => r.sector));
  renderTable(
    8,
    5,
    "Registrations by sector",
    ["Sector", "Count"],
    sectorTally.slice(0, 15).map(([k, v]) => [k, v])
  );

  // ── Data sheet ─────────────────────────────────────────────────────────────
  const data = wb.addWorksheet("Submissions Data", { views: [{ state: "frozen", ySplit: 1 }] });
  data.columns = [
    { header: "Startup", key: "startup", width: 26 },
    { header: "Founder", key: "founder", width: 22 },
    { header: "Founder Email", key: "email", width: 30 },
    { header: "Sector", key: "sector", width: 20 },
    { header: "City", key: "city", width: 16 },
    { header: "Tier", key: "tier", width: 14 },
    { header: "Score", key: "score", width: 8 },
    { header: "Status", key: "status", width: 14 },
    { header: "Registered", key: "registered", width: 14 },
  ];
  const header = data.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED } };
  header.alignment = { vertical: "middle" };
  header.height = 20;

  for (const r of rows) {
    data.addRow({
      startup: r.startup_name ?? "",
      founder: r.founder_name ?? "",
      email: r.founder_email ?? "",
      sector: r.sector ?? "",
      city: r.city ?? "",
      tier: r.tier ?? "",
      score: r.score ?? null,
      status: statusLabel(r.status),
      registered: formatDate(r.created_at),
    });
  }
  data.getColumn("score").numFmt = "0";
  data.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 9 } };

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}

// ── Committee ACTIVITY report — built from audit_log (each change, when it
// happened, by whom). This is the primary "how many approved/rejected/needs-
// update in these dates" view; the registration report above is the fallback.
export type ActivityEventRow = {
  startup_name: string | null;
  status: string | null;
  previous_status: string | null;
  actor_email: string | null;
  entity_type: string | null;
  created_at: string | null;
};

export async function buildStatusActivityReport(events: ActivityEventRow[], meta: ReportMeta): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PSEC Admin Panel";

  const dash = wb.addWorksheet("Committee Dashboard", { views: [{ showGridLines: false }] });
  dash.columns = Array.from({ length: 9 }, () => ({ width: 16 }));

  dash.mergeCells("A1:I1");
  const title = dash.getCell("A1");
  title.value = "P@SHA Startup Hub — Committee Activity Report";
  title.font = { size: 16, bold: true, color: { argb: RED } };
  title.alignment = { vertical: "middle" };
  dash.getRow(1).height = 26;

  dash.mergeCells("A2:I2");
  const sub = dash.getCell("A2");
  sub.value = `Status changes by the date they happened     •     Report date: ${meta.reportDate}     •     ${meta.filterSummary}`;
  sub.font = { size: 10, color: { argb: MUTED } };

  const total = events.length;
  const count = (s: string) => events.filter((e) => e.status === s).length;
  const kpis: [string, number][] = [
    ["TOTAL CHANGES", total],
    ["APPROVED", count("approved")],
    ["REJECTED", count("rejected")],
    ["NEEDS UPDATE", count("needs_update")],
    ["VERIFIED", count("verified")],
  ];
  kpis.forEach(([label, value], i) => {
    const col = i + 1;
    const v = dash.getCell(4, col);
    v.value = value;
    v.font = { size: 20, bold: true, color: { argb: RED } };
    v.alignment = { horizontal: "center" };
    const l = dash.getCell(5, col);
    l.value = label;
    l.font = { size: 9, bold: true, color: { argb: MUTED } };
    l.alignment = { horizontal: "center" };
  });

  const renderTable = (
    startRow: number,
    startCol: number,
    heading: string,
    headers: string[],
    body: (string | number)[][]
  ) => {
    const h = dash.getCell(startRow, startCol);
    h.value = heading;
    h.font = { size: 11, bold: true, color: { argb: INK } };
    headers.forEach((label, i) => {
      const c = dash.getCell(startRow + 1, startCol + i);
      c.value = label;
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED } };
      c.alignment = { horizontal: i === 0 ? "left" : "right" };
    });
    body.forEach((r, ri) => {
      r.forEach((cell, ci) => {
        const c = dash.getCell(startRow + 2 + ri, startCol + ci);
        c.value = cell;
        c.alignment = { horizontal: ci === 0 ? "left" : "right" };
        if (ri % 2 === 1) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STONE } };
      });
    });
  };

  const byType = tally(events.map((e) => statusLabel(e.status)));
  renderTable(8, 1, "Changes by type", ["Change", "Count"], byType.map(([k, v]) => [k, v]));

  const byAdmin = tally(events.map((e) => e.actor_email));
  renderTable(8, 5, "Changes by admin", ["Admin", "Count"], byAdmin.map(([k, v]) => [k, v]));

  // ── Activity sheet ─────────────────────────────────────────────────────────
  const data = wb.addWorksheet("Status Activity", { views: [{ state: "frozen", ySplit: 1 }] });
  data.columns = [
    { header: "Startup", key: "startup", width: 28 },
    { header: "Change", key: "change", width: 30 },
    { header: "By", key: "by", width: 28 },
    { header: "When", key: "when", width: 14 },
    { header: "Type", key: "type", width: 14 },
  ];
  const header = data.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED } };
  header.alignment = { vertical: "middle" };
  header.height = 20;

  for (const e of events) {
    const change = e.previous_status
      ? `${statusLabel(e.previous_status)} → ${statusLabel(e.status)}`
      : statusLabel(e.status);
    data.addRow({
      startup: e.startup_name ?? "",
      change,
      by: e.actor_email ?? "",
      when: formatDate(e.created_at),
      type: e.entity_type ?? "",
    });
  }
  data.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 5 } };

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
