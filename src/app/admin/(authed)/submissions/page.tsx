import { createServiceClient } from "@/lib/supabase/server";
import { SubmissionsClient } from "./SubmissionsClient";
import { parsePagination } from "@/lib/pagination";

export const dynamic = "force-dynamic";

type Filters = { q: string; status: string };

async function load(
  range: { from: number; to: number },
  filters: Filters
) {
  const supabase = createServiceClient();
  let query = supabase
    .from("submissions")
    .select(
      "id,startup_name,founder_name,founder_email,founder_mobile,primary_sector,hq_city,stage,status,vetting_tier,vetting_score,created_at",
      { count: "exact" }
    );

  if (filters.q.length >= 1) {
    const p = `%${filters.q}%`;
    query = query.or(
      `startup_name.ilike.${p},founder_name.ilike.${p},founder_email.ilike.${p},primary_sector.ilike.${p}`
    );
  }
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(range.from, range.to);
  return { rows: data ?? [], total: count ?? 0 };
}

function pickOne(sp: Record<string, string | string[] | undefined>, k: string): string {
  const v = sp[k];
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pagination = parsePagination(sp);
  const filters: Filters = {
    q: pickOne(sp, "q"),
    status: pickOne(sp, "status") || "all",
  };
  const { rows, total } = await load(pagination, filters);
  return (
    <SubmissionsClient
      initial={rows}
      total={total}
      page={pagination.page}
      pageSize={pagination.pageSize}
      filters={filters}
    />
  );
}
