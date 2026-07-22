import { createServiceClient } from "@/lib/supabase/server";
import { DatabankClient } from "./DatabankClient";
import { parsePagination } from "@/lib/utils/pagination";
import { getOptionIndex } from "@/lib/options/index.server";
import { getFormOptionRegistry } from "@/lib/options/registry.server";
import {
  matchingOptionIds,
  optionFilterValues,
  optionIdFor,
  resolveOptionLabel,
} from "@/lib/options/resolve";

export const dynamic = "force-dynamic";

type Filters = {
  q: string;
  sector: string;
  outreach: string;
  verified: string;
};

async function load(
  range: { page: number; pageSize: number; from: number; to: number },
  filters: Filters
) {
  const supabase = createServiceClient();
  const optionIndex = await getOptionIndex();
  const FULL =
    "id,startup_name,tagline,primary_industry,nic_name,city,contact_person,contact_email,outreach_status,current_revenue,investment_raised,total_employees,website,pasha_verified";
  const LEGACY = FULL.replace(",pasha_verified", "");

  const runQuery = async (cols: string) => {
    let q = supabase.from("databank").select(cols, { count: "exact" });
    const needle = filters.q.trim().replace(/[%,()]/g, " ").trim();
    if (needle.length >= 1) {
      const pattern = `%${needle}%`;
      const idMatches = matchingOptionIds(optionIndex, needle).map(
        (id) => `primary_industry_id.eq.${id}`
      );
      q = q.or(
        [
          `startup_name.ilike.${pattern}`,
          `contact_email.ilike.${pattern}`,
          `contact_person.ilike.${pattern}`,
          `primary_industry.ilike.${pattern}`,
          ...idMatches,
        ].join(",")
      );
    }
    if (filters.sector && filters.sector !== "all") {
      const id = optionIdFor(optionIndex, "SECTORS", filters.sector);
      if (id) {
        q = q.eq("primary_industry_id", id);
      } else {
        const values = optionFilterValues(optionIndex, "SECTORS", filters.sector);
        q = values.length > 1 ? q.in("primary_industry", values) : q.eq("primary_industry", filters.sector);
      }
    }
    if (filters.outreach && filters.outreach !== "all") q = q.eq("outreach_status", filters.outreach);
    if (filters.verified === "yes") q = q.eq("pasha_verified", true);
    if (filters.verified === "no") q = q.or("pasha_verified.is.null,pasha_verified.eq.false");
    return q
      .order("created_at", { ascending: false, nullsFirst: false })
      .order("current_revenue", { ascending: false, nullsFirst: false })
      .range(range.from, range.to);
  };

  type DataRow = Record<string, unknown>;
  let data: DataRow[] | null = null;
  let count: number | null = null;
  {
    const res = await runQuery(FULL);
    if (res.error && /pasha_verified/.test(res.error.message ?? "")) {
      const fallback = await runQuery(LEGACY);
      data = (fallback.data as unknown as DataRow[] | null) ?? null;
      count = fallback.count ?? null;
    } else {
      data = (res.data as unknown as DataRow[] | null) ?? null;
      count = res.count ?? null;
    }
  }
  // Dropdown values are option ids, so picking a sector filters the *_id column.
  const registry = await getFormOptionRegistry();
  const sectors = (registry.SECTORS ?? []).map((o) => ({ value: o.value, label: o.label }));

  return {
    rows: (data ?? []).map((r) => ({
      ...r,
      primary_industry: resolveOptionLabel(optionIndex, "SECTORS", r.primary_industry as string | null),
      nic_name: resolveOptionLabel(optionIndex, "NIC_CENTERS", r.nic_name as string | null),
      city: resolveOptionLabel(optionIndex, "HQ_CITIES", r.city as string | null),
    })),
    total: count ?? 0,
    sectors,
    page: range.page,
    pageSize: range.pageSize,
    filters,
  };
}

function pickOne(sp: Record<string, string | string[] | undefined>, k: string): string {
  const v = sp[k];
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function DatabankPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pagination = parsePagination(sp);
  const filters: Filters = {
    q: pickOne(sp, "q"),
    sector: pickOne(sp, "sector") || "all",
    outreach: pickOne(sp, "outreach") || "all",
    verified: pickOne(sp, "verified") || "all",
  };
  const data = await load(pagination, filters);
  return (
    <DatabankClient
      initial={
        data as unknown as {
          rows: Parameters<typeof DatabankClient>[0]["initial"]["rows"];
          total: number;
          sectors: { value: string; label: string }[];
          page: number;
          pageSize: number;
          filters: Filters;
        }
      }
    />
  );
}
