import { createServiceClient } from "@/lib/supabase/server";
import { DatabankClient } from "./DatabankClient";

export const dynamic = "force-dynamic";

async function load() {
  const supabase = createServiceClient();
  const FULL =
    "id,startup_name,tagline,primary_industry,nic_name,city,contact_person,contact_email,outreach_status,current_revenue,investment_raised,total_employees,website,pasha_verified";
  const LEGACY = FULL.replace(",pasha_verified", "");

  // Try with the new column; fall back if the migration hasn't been applied.
  type DataRow = Record<string, unknown>;
  let data: DataRow[] | null = null;
  let count: number | null = null;
  {
    const res = await supabase
      .from("databank")
      .select(FULL, { count: "exact" })
      .order("created_at", { ascending: false, nullsFirst: false })
      .order("current_revenue", { ascending: false, nullsFirst: false })
      .limit(500);
    if (res.error && /pasha_verified/.test(res.error.message ?? "")) {
      const fallback = await supabase
        .from("databank")
        .select(LEGACY, { count: "exact" })
        .order("created_at", { ascending: false, nullsFirst: false })
        .order("current_revenue", { ascending: false, nullsFirst: false })
        .limit(500);
      data = (fallback.data as unknown as DataRow[] | null) ?? null;
      count = fallback.count ?? null;
    } else {
      data = (res.data as unknown as DataRow[] | null) ?? null;
      count = res.count ?? null;
    }
  }
  const { data: industries } = await supabase
    .from("databank")
    .select("primary_industry")
    .not("primary_industry", "is", null);

  const sectorSet = new Set<string>();
  (industries ?? []).forEach((r) => r.primary_industry && sectorSet.add(r.primary_industry));

  return {
    rows: data ?? [],
    total: count ?? 0,
    sectors: Array.from(sectorSet).sort(),
  };
}

export default async function DatabankPage() {
  const data = await load();
  // The defensive fallback returns Record<string, unknown> rows because we
  // alternate two column lists. The client component's Row type is a
  // structural subset — every property is optional except id + name which
  // are always present.
  return (
    <DatabankClient
      initial={
        data as unknown as {
          rows: Parameters<typeof DatabankClient>[0]["initial"]["rows"];
          total: number;
          sectors: string[];
        }
      }
    />
  );
}
