import "server-only";
import ExcelJS from "exceljs";
import { formatDate, type ReportRow as DatabankRow } from "./databank-report.server";
import type { SubmissionReportRow } from "./submissions-report.server";

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
const statusLabel = (s: string | null) => (s ? STATUS_LABELS[s] ?? s : "—");
const OUTREACH_LABELS: Record<string, string> = {
  not_contacted: "Not contacted",
  invited: "Invited",
  responded: "Responded",
  submitted: "Submitted",
  declined: "Declined",
};
const outreachLabel = (s: string | null) => (s ? OUTREACH_LABELS[s] ?? s : "Not contacted");

function tally(values: (string | null)[]): [string, number][] {
  const m = new Map<string, number>();
  for (const v of values) {
    const key = v && v.trim() ? v.trim() : "—";
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

// One report to answer it all: submissions summary + databank records, in a
// single workbook (Overview dashboard, Submissions sheet, Databank sheet).
export async function buildOverviewReport(
  subs: SubmissionReportRow[],
  dbs: DatabankRow[],
  meta: ReportMeta
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PSEC Admin Panel";

  // ── Overview ────────────────────────────────────────────────────────────────
  const dash = wb.addWorksheet("Overview", { views: [{ showGridLines: false }] });
  dash.columns = Array.from({ length: 9 }, () => ({ width: 16 }));

  dash.mergeCells("A1:I1");
  const title = dash.getCell("A1");
  title.value = "P@SHA Startup Hub — Startup Report";
  title.font = { size: 16, bold: true, color: { argb: RED } };
  title.alignment = { vertical: "middle" };
  dash.getRow(1).height = 26;

  dash.mergeCells("A2:I2");
  const sub = dash.getCell("A2");
  sub.value = `Prepared from PSEC Admin Panel data     •     Report date: ${meta.reportDate}     •     ${meta.filterSummary}`;
  sub.font = { size: 10, color: { argb: MUTED } };

  const band = (row: number, section: string, kpis: [string, number][]) => {
    const s = dash.getCell(row, 1);
    s.value = section;
    s.font = { size: 11, bold: true, color: { argb: INK } };
    kpis.forEach(([label, value], i) => {
      const col = i + 1;
      const v = dash.getCell(row + 1, col);
      v.value = value;
      v.font = { size: 20, bold: true, color: { argb: RED } };
      v.alignment = { horizontal: "center" };
      const l = dash.getCell(row + 2, col);
      l.value = label;
      l.font = { size: 9, bold: true, color: { argb: MUTED } };
      l.alignment = { horizontal: "center" };
    });
  };

  const subCount = (s: string) => subs.filter((r) => r.status === s).length;
  const verified = dbs.filter((r) => r.pasha_verified).length;

  band(4, "Submissions", [
    ["TOTAL", subs.length],
    ["APPROVED", subCount("approved")],
    ["REJECTED", subCount("rejected")],
    ["NEEDS UPDATE", subCount("needs_update")],
    ["PENDING", subCount("submitted") + subCount("pending")],
  ]);
  band(8, "Databank", [
    ["IN DATABANK", dbs.length],
    ["VERIFIED", verified],
    ["NOT VERIFIED", dbs.length - verified],
    ["SECTORS", tally(dbs.map((r) => r.sector)).filter(([k]) => k !== "—").length],
  ]);

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

  renderTable(
    12,
    1,
    "Submissions by status",
    ["Status", "Count"],
    tally(subs.map((r) => statusLabel(r.status))).map(([k, v]) => [k, v])
  );
  renderTable(
    12,
    5,
    "Databank by sector",
    ["Sector", "Count"],
    tally(dbs.map((r) => r.sector)).slice(0, 15).map(([k, v]) => [k, v])
  );

  // ── Submissions sheet ───────────────────────────────────────────────────────
  const sSheet = wb.addWorksheet("Submissions", { views: [{ state: "frozen", ySplit: 1 }] });
  sSheet.columns = [
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
  styleHeader(sSheet);
  for (const r of subs) {
    sSheet.addRow({
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
  sSheet.getColumn("score").numFmt = "0";
  sSheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 9 } };

  // ── Databank sheet ──────────────────────────────────────────────────────────
  const dSheet = wb.addWorksheet("Databank", { views: [{ state: "frozen", ySplit: 1 }] });
  dSheet.columns = [
    { header: "Startup", key: "startup", width: 28 },
    { header: "Sector", key: "sector", width: 20 },
    { header: "City", key: "city", width: 16 },
    { header: "Contact", key: "contact", width: 20 },
    { header: "Email", key: "email", width: 30 },
    { header: "Employees", key: "employees", width: 12 },
    { header: "Revenue (PKR)", key: "revenue", width: 16 },
    { header: "Investment (PKR)", key: "investment", width: 18 },
    { header: "Verified", key: "verified", width: 10 },
    { header: "Outreach", key: "outreach", width: 14 },
    { header: "Date added", key: "created", width: 14 },
  ];
  styleHeader(dSheet);
  for (const r of dbs) {
    dSheet.addRow({
      startup: r.startup_name ?? "",
      sector: r.sector ?? "",
      city: r.city ?? "",
      contact: r.contact_person ?? "",
      email: r.contact_email ?? "",
      employees: r.total_employees ?? null,
      revenue: r.current_revenue ?? null,
      investment: r.investment_raised ?? null,
      verified: r.pasha_verified ? "Yes" : "No",
      outreach: outreachLabel(r.outreach_status),
      created: formatDate(r.created_at),
    });
  }
  dSheet.getColumn("employees").numFmt = "#,##0";
  dSheet.getColumn("revenue").numFmt = "#,##0";
  dSheet.getColumn("investment").numFmt = "#,##0";
  dSheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 11 } };

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}

function styleHeader(ws: ExcelJS.Worksheet) {
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED } };
  header.alignment = { vertical: "middle" };
  header.height = 20;
}
