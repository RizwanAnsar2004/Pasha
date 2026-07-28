// Admin-only: the startup lifecycle activity trail, read from audit_log with
// filters (action / startup preset, date range, startup name or actor).

import { NextResponse } from "next/server";
import { createClient as createSessionClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin/admin-allowlist";
import { parsePagination } from "@/lib/utils/pagination";
import { fetchAllRowsBatched } from "@/lib/utils/csv";
import { STARTUP_ACTIONS } from "@/lib/reports/committee-activity.server";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  actor_email: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string | null;
};

async function requireAdmin() {
  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user || !(await isAdminEmail(user.email))) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user, error: null };
}

// Attach the startup name to each row (audit_log stores only the id), and pull a
// display name out of the payload as a fallback for deleted rows.
async function withStartupNames(
  supabase: ReturnType<typeof createServiceClient>,
  rows: Row[]
): Promise<(Row & { startup_name: string | null })[]> {
  const ids = [...new Set(rows.map((r) => r.resource_id).filter((v): v is string => Boolean(v)))];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const [{ data: subs }, { data: dbs }] = await Promise.all([
      supabase.from("submissions").select("id,startup_name").in("id", ids),
      supabase.from("databank").select("id,startup_name").in("id", ids),
    ]);
    for (const x of (subs ?? []) as { id: string; startup_name: string | null }[]) if (x.startup_name) names.set(x.id, x.startup_name);
    for (const x of (dbs ?? []) as { id: string; startup_name: string | null }[]) if (x.startup_name) names.set(x.id, x.startup_name);
  }
  return rows.map((r) => ({
    ...r,
    startup_name:
      (r.resource_id ? names.get(r.resource_id) : null) ??
      (typeof r.payload?.startup_name === "string" ? (r.payload.startup_name as string) : null),
  }));
}

async function getHandler(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const url = new URL(req.url);
  const action = url.searchParams.get("action")?.trim() ?? "startup"; // default: startup lifecycle
  const q = (url.searchParams.get("q")?.trim() ?? "").replace(/[%,()]/g, " ").trim();
  const from = url.searchParams.get("from")?.trim() ?? "";
  const to = url.searchParams.get("to")?.trim() ?? "";
  const all = url.searchParams.get("all") === "1";
  const { page, pageSize, from: rangeFrom, to: rangeTo } = parsePagination(url);

  const supabase = createServiceClient();
  const lo = from ? `${from}T00:00:00Z` : null;
  const hi = to ? `${to}T23:59:59.999Z` : null;

  // Resolve startup ids whose name matches the search, so a name search finds
  // every lifecycle event (which are keyed by submission OR databank id).
  let startupIds: string[] = [];
  if (q) {
    const [{ data: subs }, { data: dbs }] = await Promise.all([
      supabase.from("submissions").select("id").ilike("startup_name", `%${q}%`).limit(300),
      supabase.from("databank").select("id").ilike("startup_name", `%${q}%`).limit(300),
    ]);
    startupIds = [
      ...(subs ?? []).map((r) => (r as { id: string }).id),
      ...(dbs ?? []).map((r) => (r as { id: string }).id),
    ];
  }

  const buildQuery = () => {
    let query = supabase
      .from("audit_log")
      .select("id,actor_email,action,resource_type,resource_id,payload,created_at", { count: "exact" });

    if (action === "startup") query = query.in("action", STARTUP_ACTIONS);
    else if (action && action !== "all") query = query.eq("action", action);

    if (lo) query = query.gte("created_at", lo);
    if (hi) query = query.lte("created_at", hi);

    if (q) {
      const orParts = [`actor_email.ilike.%${q}%`, `action.ilike.%${q}%`];
      if (startupIds.length > 0) orParts.push(`resource_id.in.(${startupIds.join(",")})`);
      query = query.or(orParts.join(","));
    }

    return query.order("created_at", { ascending: false });
  };

  if (all) {
    try {
      const { rows, total } = await fetchAllRowsBatched<Row>((f, t) => buildQuery().range(f, t));
      return NextResponse.json({ rows: await withStartupNames(supabase, rows), total, page, pageSize });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Export failed" }, { status: 500 });
    }
  }

  const { data, count, error: dbErr } = await buildQuery().range(rangeFrom, rangeTo);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  const rows = await withStartupNames(supabase, (data ?? []) as Row[]);
  return NextResponse.json({ rows, total: count ?? 0, page, pageSize });
}

export const GET = getHandler;
