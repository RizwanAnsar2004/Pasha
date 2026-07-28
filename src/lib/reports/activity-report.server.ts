import "server-only";
import ExcelJS from "exceljs";
import { formatDate } from "./databank-report.server";
import type { EnrichedActivityRow } from "./committee-activity.server";

export type ReportMeta = { reportDate: string; filterSummary: string };

const RED = "FFC8102E";
const INK = "FF111111";
const MUTED = "FF6B7280";
const STONE = "FFF6F4F2";

function tally(values: (string | null)[]): [string, number][] {
  const m = new Map<string, number>();
  for (const v of values) {
    const key = v && v.trim() ? v.trim() : "—";
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function fmtWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${formatDate(iso)} ${hh}:${mm}`;
}

// Startup activity report: audit_log events joined to submissions + databank.
export async function buildActivityReport(rows: EnrichedActivityRow[], meta: ReportMeta): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PSEC Admin Panel";

  const dash = wb.addWorksheet("Activity Dashboard", { views: [{ showGridLines: false }] });
  dash.columns = Array.from({ length: 9 }, () => ({ width: 16 }));

  dash.mergeCells("A1:I1");
  const title = dash.getCell("A1");
  title.value = "P@SHA Startup Hub — Startup Activity Report";
  title.font = { size: 16, bold: true, color: { argb: RED } };
  title.alignment = { vertical: "middle" };
  dash.getRow(1).height = 26;

  dash.mergeCells("A2:I2");
  const sub = dash.getCell("A2");
  sub.value = `Lifecycle activity from the audit trail     •     Report date: ${meta.reportDate}     •     ${meta.filterSummary}`;
  sub.font = { size: 10, color: { argb: MUTED } };

  const total = rows.length;
  const count = (a: string) => rows.filter((r) => r.action === a).length;
  const kpis: [string, number][] = [
    ["TOTAL EVENTS", total],
    ["APPROVED", count("submission.approved")],
    ["REJECTED", count("submission.rejected")],
    ["NEEDS UPDATE", count("submission.needs_update")],
    ["FEATURED", count("featured.added")],
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

  renderTable(8, 1, "By action", ["Action", "Count"], tally(rows.map((r) => r.action_label)).map(([k, v]) => [k, v]));
  renderTable(8, 4, "By admin", ["Admin", "Count"], tally(rows.map((r) => r.actor_email)).map(([k, v]) => [k, v]));
  renderTable(8, 7, "By sector", ["Sector", "Count"], tally(rows.map((r) => r.sector)).slice(0, 15).map(([k, v]) => [k, v]));

  // ── Activity sheet (event + joined startup data) ────────────────────────────
  const data = wb.addWorksheet("Activity", { views: [{ state: "frozen", ySplit: 1 }] });
  data.columns = [
    { header: "When", key: "when", width: 18 },
    { header: "Startup", key: "startup", width: 26 },
    { header: "Action", key: "action", width: 18 },
    { header: "By", key: "by", width: 26 },
    { header: "Sector", key: "sector", width: 18 },
    { header: "City", key: "city", width: 14 },
    { header: "Founder", key: "founder", width: 20 },
    { header: "Tier", key: "tier", width: 12 },
    { header: "Score", key: "score", width: 8 },
    { header: "Current status", key: "status", width: 14 },
    { header: "Revenue (PKR)", key: "revenue", width: 16 },
    { header: "Investment (PKR)", key: "investment", width: 16 },
    { header: "Verified", key: "verified", width: 10 },
    { header: "Details", key: "details", width: 28 },
  ];
  const header = data.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED } };
  header.alignment = { vertical: "middle" };
  header.height = 20;

  for (const r of rows) {
    data.addRow({
      when: fmtWhen(r.created_at),
      startup: r.startup_name ?? "",
      action: r.action_label,
      by: r.actor_email ?? "",
      sector: r.sector ?? "",
      city: r.city ?? "",
      founder: r.founder_name ?? "",
      tier: r.tier ?? "",
      score: r.score ?? null,
      status: r.current_status ?? "",
      revenue: r.revenue ?? null,
      investment: r.investment ?? null,
      verified: r.verified ? "Yes" : "No",
      details: r.details ?? "",
    });
  }
  data.getColumn("score").numFmt = "0";
  data.getColumn("revenue").numFmt = "#,##0";
  data.getColumn("investment").numFmt = "#,##0";
  data.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 14 } };

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
