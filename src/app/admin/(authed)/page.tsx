import { createServiceClient } from "@/lib/supabase/server";
import { getOptionIndex } from "@/lib/options/index.server";
import { resolveOptionLabel } from "@/lib/options/resolve";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

async function loadStats() {
  const supabase = createServiceClient();

  const [
    { data: subStats },
    { data: dbStats },
    { data: bySector },
    { data: byTier },
    { data: recent },
  ] = await Promise.all([
    supabase.from("submission_stats").select("*").single(),
    supabase.from("databank_stats").select("*").single(),
    supabase
      .from("submissions")
      .select("primary_sector")
      .not("primary_sector", "is", null),
    supabase
      .from("submissions")
      .select("vetting_tier")
      .not("vetting_tier", "is", null),
    supabase
      .from("submissions")
      .select(
        "id,startup_name,founder_name,founder_email,vetting_tier,vetting_score,status,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  // primary_sector holds an option id (UUID) for newer rows and a plain value
  // for legacy ones — resolve both to their label so the chart shows sector
  // names (and id/value duplicates of the same sector merge into one bar).
  const optionIndex = await getOptionIndex();
  const sectorCounts: Record<string, number> = {};
  (bySector ?? []).forEach((r) => {
    if (!r.primary_sector) return;
    const name = resolveOptionLabel(optionIndex, "SECTORS", r.primary_sector as string) ?? "Unknown";
    sectorCounts[name] = (sectorCounts[name] ?? 0) + 1;
  });
  const sectorData = Object.entries(sectorCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const tierCounts: Record<string, number> = {};
  (byTier ?? []).forEach((r) => {
    if (r.vetting_tier) tierCounts[r.vetting_tier] = (tierCounts[r.vetting_tier] ?? 0) + 1;
  });

  return {
    submissions: subStats ?? {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      watchlist: 0,
      last_24h: 0,
      last_7d: 0,
    },
    databank: dbStats ?? {
      total: 0,
      not_contacted: 0,
      invited: 0,
      submitted: 0,
      with_revenue: 0,
      with_investment: 0,
    },
    sectorData,
    tierCounts,
    recent: recent ?? [],
  };
}

export default async function AdminOverview() {
  const data = await loadStats();
  return <DashboardClient initial={data} />;
}
