// Admin-only: the startup activity report (.xlsx) — audit_log events joined to
// submissions + databank. Honors the Activity Log filters (action, date, search).

import { NextResponse } from "next/server";
import { createClient as createSessionClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin/admin-allowlist";
import { getEnrichedActivity } from "@/lib/reports/committee-activity.server";
import { buildActivityReport } from "@/lib/reports/activity-report.server";
import { formatDate } from "@/lib/reports/databank-report.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user || !(await isAdminEmail(user.email))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action")?.trim() || "startup";
  const q = url.searchParams.get("q")?.trim() ?? "";
  const from = url.searchParams.get("from")?.trim() ?? "";
  const to = url.searchParams.get("to")?.trim() ?? "";
  const lo = from ? `${from}T00:00:00Z` : null;
  const hi = to ? `${to}T23:59:59.999Z` : null;

  const supabase = createServiceClient();
  let rows;
  try {
    rows = await getEnrichedActivity(supabase, { lo, hi, action, q });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Query failed" }, { status: 500 });
  }

  const parts: string[] = [];
  if (q) parts.push(`search "${q}"`);
  if (action && action !== "startup" && action !== "all") parts.push(`action ${action}`);
  if (from || to) parts.push(`dates ${from || "…"} → ${to || "…"}`);
  const filterSummary = parts.length ? `Filters: ${parts.join(", ")}` : "All startup activity";

  const now = new Date();
  const buffer = await buildActivityReport(rows, { reportDate: formatDate(now.toISOString()), filterSummary });

  const stamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="PASHA_Startup_Activity_${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
