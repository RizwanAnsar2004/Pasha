import "server-only";
import ExcelJS from "exceljs";

// One databank row, already resolved to display labels, for the report.
export type ReportRow = {
  startup_name: string | null;
  sector: string | null;
  city: string | null;
  contact_person: string | null;
  contact_email: string | null;
  total_employees: number | null;
  current_revenue: number | null;
  investment_raised: number | null;
  pasha_verified: boolean | null;
  outreach_status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ReportMeta = { reportDate: string; filterSummary: string };

const RED = "FFC8102E";
const INK = "FF111111";
const MUTED = "FF6B7280";
const STONE = "FFF6F4F2";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const OUTREACH_LABELS: Record<string, string> = {
  not_contacted: "Not contacted",
  invited: "Invited",
  responded: "Responded",
  submitted: "Submitted",
  declined: "Declined",
};
const outreachLabel = (s: string | null): string => (s ? OUTREACH_LABELS[s] ?? s : "Not contacted");

// Count occurrences into a Map, ignoring empties.
function tally(values: (string | null)[]): [string, number][] {
  const m = new Map<string, number>();
  for (const v of values) {
    const key = v && v.trim() ? v.trim() : "—";
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export async function buildDatabankReport(rows: ReportRow[], meta: ReportMeta): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PSEC Admin Panel";

  // ── Dashboard sheet ────────────────────────────────────────────────────────
  const dash = wb.addWorksheet("Committee Dashboard", {
    views: [{ showGridLines: false }],
  });
  dash.columns = Array.from({ length: 9 }, () => ({ width: 16 }));

  dash.mergeCells("A1:I1");
  const title = dash.getCell("A1");
  title.value = "P@SHA Startup Hub — Databank Report";
  title.font = { size: 16, bold: true, color: { argb: RED } };
  title.alignment = { vertical: "middle" };
  dash.getRow(1).height = 26;

  dash.mergeCells("A2:I2");
  const sub = dash.getCell("A2");
  sub.value = `Prepared from PSEC Admin Panel data     •     Report date: ${meta.reportDate}     •     ${meta.filterSummary}`;
  sub.font = { size: 10, color: { argb: MUTED } };

  // KPI band.
  const total = rows.length;
  const verified = rows.filter((r) => r.pasha_verified).length;
  const contacted = rows.filter((r) => r.outreach_status && r.outreach_status !== "not_contacted").length;
  const sectorTally = tally(rows.map((r) => r.sector));
  const kpis: [string, number][] = [
    ["TOTAL STARTUPS", total],
    ["VERIFIED", verified],
    ["NOT VERIFIED", total - verified],
    ["CONTACTED", contacted],
    ["SECTORS", sectorTally.filter(([k]) => k !== "—").length],
  ];
  kpis.forEach(([label, value], i) => {
    const col = i + 1;
    const vCell = dash.getCell(4, col);
    vCell.value = value;
    vCell.font = { size: 20, bold: true, color: { argb: RED } };
    vCell.alignment = { horizontal: "center" };
    const lCell = dash.getCell(5, col);
    lCell.value = label;
    lCell.font = { size: 9, bold: true, color: { argb: MUTED } };
    lCell.alignment = { horizontal: "center" };
  });

  // Helper: render a small titled table at (startRow, startCol).
  const renderTable = (
    startRow: number,
    startCol: number,
    heading: string,
    headers: string[],
    body: (string | number)[][]
  ) => {
    const hCell = dash.getCell(startRow, startCol);
    hCell.value = heading;
    hCell.font = { size: 11, bold: true, color: { argb: INK } };

    const headRow = startRow + 1;
    headers.forEach((h, i) => {
      const c = dash.getCell(headRow, startCol + i);
      c.value = h;
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED } };
      c.alignment = { horizontal: i === 0 ? "left" : "right" };
    });
    body.forEach((r, ri) => {
      r.forEach((cell, ci) => {
        const c = dash.getCell(headRow + 1 + ri, startCol + ci);
        c.value = cell;
        c.alignment = { horizontal: ci === 0 ? "left" : "right" };
        if (ri % 2 === 1) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STONE } };
      });
    });
  };

  const pct = (n: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : "0%");

  renderTable(8, 1, "Verified breakdown", ["Status", "Count", "% of total"], [
    ["Verified", verified, pct(verified)],
    ["Not verified", total - verified, pct(total - verified)],
  ]);

  const outreachTally = tally(rows.map((r) => outreachLabel(r.outreach_status)));
  renderTable(
    8,
    5,
    "By outreach status",
    ["Outreach", "Count"],
    outreachTally.map(([k, v]) => [k, v])
  );

  renderTable(
    13,
    1,
    "Submissions by sector",
    ["Sector", "Count"],
    sectorTally.slice(0, 15).map(([k, v]) => [k, v])
  );

  // ── Data sheet ─────────────────────────────────────────────────────────────
  const data = wb.addWorksheet("Databank Data", { views: [{ state: "frozen", ySplit: 1 }] });
  data.columns = [
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
    { header: "Last updated", key: "updated", width: 14 },
  ];

  const header = data.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED } };
  header.alignment = { vertical: "middle" };
  header.height = 20;

  for (const r of rows) {
    data.addRow({
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
      updated: formatDate(r.updated_at),
    });
  }

  data.getColumn("employees").numFmt = "#,##0";
  data.getColumn("revenue").numFmt = "#,##0";
  data.getColumn("investment").numFmt = "#,##0";
  data.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 12 } };

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
