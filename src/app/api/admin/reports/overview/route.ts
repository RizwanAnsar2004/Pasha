// Admin-only: the single Startup Report (.xlsx) — submissions summary + databank
// records in one workbook, filtered by search / sector / date-added window.

import { NextResponse } from "next/server";
import { createClient as createSessionClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin/admin-allowlist";
import { getOptionIndex } from "@/lib/options/index.server";
import { matchingOptionIds, optionFilterValues, optionIdFor, resolveOptionLabel } from "@/lib/options/resolve";
import { fetchAllRowsBatched } from "@/lib/utils/csv";
import { buildOverviewReport } from "@/lib/reports/overview-report.server";
import { formatDate, type ReportRow as DatabankRow } from "@/lib/reports/databank-report.server";
import type { SubmissionReportRow } from "@/lib/reports/submissions-report.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUB_COLS =
  "startup_name,founder_name,founder_email,primary_sector,hq_city,hq_other,vetting_tier,vetting_score,status,created_at";
const DB_COLS =
  "startup_name,primary_industry,primary_industry_id,city,contact_person,contact_email,total_employees,current_revenue,investment_raised,pasha_verified,outreach_status,created_at";

type Row = Record<string, unknown>;

export async function GET(req: Request) {
  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user || !(await isAdminEmail(user.email))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const sector = url.searchParams.get("sector")?.trim() ?? "";
  const from = url.searchParams.get("from")?.trim() ?? "";
  const to = url.searchParams.get("to")?.trim() ?? "";

  const supabase = createServiceClient();
  const optionIndex = await getOptionIndex();
  const term = q.replace(/[%,()]/g, " ").trim();
  const lo = from ? `${from}T00:00:00Z` : null;
  const hi = to ? `${to}T23:59:59.999Z` : null;

  // Submissions (registration date window).
  const subQuery = () => {
    let query = supabase.from("submissions").select(SUB_COLS, { count: "exact" });
    if (term) {
      const p = `%${term}%`;
      query = query.or([`startup_name.ilike.${p}`, `founder_name.ilike.${p}`, `founder_email.ilike.${p}`].join(","));
    }
    if (sector && sector !== "all") {
      const values = optionFilterValues(optionIndex, "SECTORS", sector);
      query = values.length > 1 ? query.in("primary_sector", values) : query.eq("primary_sector", sector);
    }
    if (lo) query = query.gte("created_at", lo);
    if (hi) query = query.lte("created_at", hi);
    return query.order("created_at", { ascending: false, nullsFirst: false });
  };

  // Databank (added date window).
  const dbQuery = () => {
    let query = supabase.from("databank").select(DB_COLS, { count: "exact" });
    if (term) {
      const p = `%${term}%`;
      const idMatches = matchingOptionIds(optionIndex, term).map((id) => `primary_industry_id.eq.${id}`);
      query = query.or(
        [`startup_name.ilike.${p}`, `contact_email.ilike.${p}`, `contact_person.ilike.${p}`, `primary_industry.ilike.${p}`, ...idMatches].join(",")
      );
    }
    if (sector && sector !== "all") {
      const id = optionIdFor(optionIndex, "SECTORS", sector);
      if (id) query = query.eq("primary_industry_id", id);
      else {
        const values = optionFilterValues(optionIndex, "SECTORS", sector);
        query = values.length > 1 ? query.in("primary_industry", values) : query.eq("primary_industry", sector);
      }
    }
    if (lo) query = query.gte("created_at", lo);
    if (hi) query = query.lte("created_at", hi);
    return query.order("created_at", { ascending: false, nullsFirst: false });
  };

  let subRows: Row[];
  let dbRows: Row[];
  try {
    [{ rows: subRows }, { rows: dbRows }] = await Promise.all([
      fetchAllRowsBatched<Row>((f, t) => subQuery().range(f, t)),
      fetchAllRowsBatched<Row>((f, t) => dbQuery().range(f, t)),
    ]);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Query failed" }, { status: 500 });
  }

  const subs: SubmissionReportRow[] = subRows.map((r) => {
    const cityLabel = resolveOptionLabel(optionIndex, "HQ_CITIES", (r.hq_city as string | null) ?? null);
    return {
      startup_name: (r.startup_name as string | null) ?? null,
      founder_name: (r.founder_name as string | null) ?? null,
      founder_email: (r.founder_email as string | null) ?? null,
      sector: resolveOptionLabel(optionIndex, "SECTORS", (r.primary_sector as string | null) ?? null),
      city: cityLabel || ((r.hq_other as string | null) ?? null),
      tier: (r.vetting_tier as string | null) ?? null,
      score: (r.vetting_score as number | null) ?? null,
      status: (r.status as string | null) ?? null,
      created_at: (r.created_at as string | null) ?? null,
    };
  });

  const dbs: DatabankRow[] = dbRows.map((r) => ({
    startup_name: (r.startup_name as string | null) ?? null,
    sector: resolveOptionLabel(optionIndex, "SECTORS", (r.primary_industry as string | null) ?? null),
    city: resolveOptionLabel(optionIndex, "HQ_CITIES", (r.city as string | null) ?? null),
    contact_person: (r.contact_person as string | null) ?? null,
    contact_email: (r.contact_email as string | null) ?? null,
    total_employees: (r.total_employees as number | null) ?? null,
    current_revenue: (r.current_revenue as number | null) ?? null,
    investment_raised: (r.investment_raised as number | null) ?? null,
    pasha_verified: Boolean(r.pasha_verified),
    outreach_status: (r.outreach_status as string | null) ?? null,
    created_at: (r.created_at as string | null) ?? null,
    updated_at: null,
  }));

  const parts: string[] = [];
  if (q) parts.push(`search "${q}"`);
  if (sector && sector !== "all") parts.push(`sector ${sector}`);
  if (from || to) parts.push(`dates ${from || "…"} → ${to || "…"}`);
  const filterSummary = parts.length ? `Filters: ${parts.join(", ")}` : "All startups";

  const now = new Date();
  const buffer = await buildOverviewReport(subs, dbs, { reportDate: formatDate(now.toISOString()), filterSummary });

  const stamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="PASHA_Startup_Report_${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
