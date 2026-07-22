import { createServiceClient } from "@/lib/supabase/server";
import { SubmissionsClient } from "./SubmissionsClient";
import { parsePagination } from "@/lib/utils/pagination";
import { getOptionIndex } from "@/lib/options/index.server";
import { matchingOptionIds, resolveOptionLabel } from "@/lib/options/resolve";

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

  const index = await getOptionIndex();

  if (filters.q.length >= 1) {
    const p = `%${filters.q}%`;
    const idMatches = matchingOptionIds(index, filters.q).flatMap((id) => [
      `primary_sector_id.eq.${id}`,
      `stage_id.eq.${id}`,
      `hq_city_id.eq.${id}`,
    ]);
    query = query.or(
      [
        `startup_name.ilike.${p}`,
        `founder_name.ilike.${p}`,
        `founder_email.ilike.${p}`,
        `primary_sector.ilike.${p}`,
        ...idMatches,
      ].join(",")
    );
  }
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(range.from, range.to);
  const rows = (data ?? []).map((r) => ({
    ...r,
    primary_sector: resolveOptionLabel(index, "SECTORS", r.primary_sector),
    hq_city: resolveOptionLabel(index, "HQ_CITIES", r.hq_city),
    stage: resolveOptionLabel(index, "STAGES", r.stage),
  }));
  return { rows, total: count ?? 0 };
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
  const [{ rows, total }, optionIndex] = await Promise.all([
    load(pagination, filters),
    getOptionIndex(),
  ]);
  return (
    <SubmissionsClient
      initial={rows}
      total={total}
      page={pagination.page}
      pageSize={pagination.pageSize}
      filters={filters}
      optionIndex={optionIndex}
    />
  );
}
