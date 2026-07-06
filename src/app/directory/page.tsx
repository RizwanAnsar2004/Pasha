import type { Metadata } from "next";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DirectoryClient } from "./DirectoryClient";
import type { DirectoryRow, DirectoryFilters } from "./DirectoryClient";
import { DirectoryHero } from "@/components/directory/DirectoryHero";
import { createServiceClient } from "@/lib/supabase/server";
import { DUMMY_STARTUPS } from "@/lib/dummy-startups";

export const metadata: Metadata = {
  title: "Directory",
  description:
    "P@SHA Startup Directory — browse 2,481 startups across cities and sectors. Maintained by the Pakistan Software Houses Association (P@SHA).",
  alternates: { canonical: "/directory" },
  openGraph: {
    title: "Directory · P@SHA Startup Community",
    url: "/directory",
  },
  twitter: {
    title: "Directory · P@SHA Startup Community",
  },
};

// Reads searchParams (page + filters), so this route renders dynamically.
export const dynamic = "force-dynamic";

export const PAGE_SIZE = 12;

// Card column set, richest first. If a column is missing (pre-migration), we
// retry with the smaller, always-present set so the page still renders.
const SELECT_COLUMNS =
  "id,startup_name,tagline,startup_idea,primary_industry,nic_name,city,website,logo_url,current_revenue,investment_raised,number_of_customers,total_employees,female_employees,pasha_verified,women_led,hiring,fundraising,founded_date,product_stage,business_types,incubation_stage,jobs_created,answers";
const SELECT_COLUMNS_FALLBACK =
  "id,startup_name,tagline,primary_industry,nic_name,city,website,logo_url,current_revenue,investment_raised,number_of_customers,total_employees,pasha_verified";

type SearchParams = Record<string, string | string[] | undefined>;

// The listing card only ever reads these two answer keys (range-band fallbacks
// for funding / customers). We MUST NOT ship the rest of the `answers` bag to
// the browser: it holds private document signed-URLs (founder CNIC/passport,
// business-profile PDF, registration cert, authorization letter) and other
// backend-only data. Since rows are passed into a client component, whatever is
// on them is serialized into the public payload — so strip answers here.
// tam_amount is public (shown as a card stat); the funding/customers bands are
// used for range-label fallbacks. Everything else in `answers` stays server-side.
const PUBLIC_ANSWER_KEYS_FOR_CARD = ["total_funding_raised", "num_customers", "tam_amount"] as const;
function stripAnswers(rows: DirectoryRow[]): DirectoryRow[] {
  return rows.map((r) => {
    const a = r.answers && typeof r.answers === "object" ? (r.answers as Record<string, unknown>) : null;
    if (!a) return r;
    const safe: Record<string, unknown> = {};
    for (const k of PUBLIC_ANSWER_KEYS_FOR_CARD) {
      if (a[k] != null) safe[k] = a[k];
    }
    return { ...r, answers: safe };
  });
}

function isMissing(v?: string | null): boolean {
  if (!v) return true;
  const s = String(v).trim();
  return !s || s.toUpperCase() === "NULL";
}

function parseFilters(sp: SearchParams): DirectoryFilters {
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const bool = (v: string | string[] | undefined) => {
    const s = str(v);
    return s === "1" || s === "true";
  };
  return {
    q: str(sp.q).trim(),
    sector: str(sp.sector) || "all",
    city: str(sp.city) || "all",
    verified: bool(sp.verified),
    womenLed: bool(sp.women_led),
    hiring: bool(sp.hiring),
  };
}

// PostgREST query builder is loosely typed across column sets; keep it untyped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, f: DirectoryFilters) {
  if (f.sector !== "all") query = query.eq("primary_industry", f.sector);
  if (f.city !== "all") query = query.eq("city", f.city);
  if (f.verified) query = query.eq("pasha_verified", true);
  if (f.womenLed) query = query.eq("women_led", true);
  if (f.hiring) query = query.eq("hiring", true);
  // Strip PostgREST `or()` delimiters from the user term, then match across the
  // searchable text columns. (founder_name lives in key_persons, not databank,
  // so it isn't searchable from the listing table.)
  const term = f.q.replace(/[%,()]/g, " ").trim();
  if (term) {
    const like = `%${term}%`;
    query = query.or(
      [
        `startup_name.ilike.${like}`,
        `tagline.ilike.${like}`,
        `primary_industry.ilike.${like}`,
        `nic_name.ilike.${like}`,
        `city.ilike.${like}`,
      ].join(",")
    );
  }
  return query;
}

// Fetch ONE page of rows + the filtered total count in a single round-trip.
async function loadPage(
  filters: DirectoryFilters,
  page: number
): Promise<{ rows: DirectoryRow[]; total: number } | null> {
  const supabase = createServiceClient();
  const offset = (page - 1) * PAGE_SIZE;

  for (const columns of [SELECT_COLUMNS, SELECT_COLUMNS_FALLBACK]) {
    let query = supabase.from("databank").select(columns, { count: "exact" });
    query = applyFilters(query, filters);
    const { data, count, error } = await query
      // Verified first, then newest, then revenue (matches the prior ordering).
      .order("pasha_verified", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false })
      .order("current_revenue", { ascending: false, nullsFirst: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      // A missing column → retry with the more compatible set; otherwise bail.
      if (columns === SELECT_COLUMNS) continue;
      return null;
    }
    return { rows: stripAnswers((data ?? []) as unknown as DirectoryRow[]), total: count ?? 0 };
  }
  return null;
}

// Filter-dropdown options + the unfiltered total. These change rarely, so cache
// for 5 minutes — they no longer re-scan the table on every navigation.
const getDirectoryMeta = unstable_cache(
  async (): Promise<{ sectors: string[]; cities: string[]; totalAll: number }> => {
    const supabase = createServiceClient();
    const [{ data: opts }, { count }] = await Promise.all([
      supabase.from("databank").select("primary_industry, city"),
      supabase.from("databank").select("id", { count: "exact", head: true }),
    ]);
    const sectors = Array.from(
      new Set(
        (opts ?? [])
          .map((r) => r.primary_industry)
          .filter((s): s is string => !isMissing(s))
      )
    ).sort();
    const cities = Array.from(
      new Set(
        (opts ?? [])
          .map((r) => r.city)
          .filter((s): s is string => !isMissing(s))
          .map((s) => s.trim())
      )
    ).sort();
    return { sectors, cities, totalAll: count ?? 0 };
  },
  ["directory-meta-v1"],
  { revalidate: 300 }
);

// In-memory filter + paginate, used only for the bundled sample data when no
// real DB rows exist yet (dev / pre-seed). Mirrors the server-side filters.
function inMemory(
  all: DirectoryRow[],
  filters: DirectoryFilters,
  page: number
): { rows: DirectoryRow[]; total: number } {
  const needle = filters.q.toLowerCase();
  const matched = all.filter((r) => {
    if (filters.sector !== "all" && r.primary_industry !== filters.sector) return false;
    if (filters.city !== "all" && r.city !== filters.city) return false;
    if (filters.verified && !r.pasha_verified) return false;
    if (filters.womenLed && !r.women_led) return false;
    if (filters.hiring && !r.hiring) return false;
    if (!needle) return true;
    const hay = [r.startup_name, r.primary_industry, r.nic_name, r.city]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });
  const offset = (page - 1) * PAGE_SIZE;
  return { rows: matched.slice(offset, offset + PAGE_SIZE), total: matched.length };
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const pageRaw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = Math.max(1, Number(pageRaw) || 1);

  const [pageResult, meta] = await Promise.all([loadPage(filters, page), getDirectoryMeta()]);

  let rows = pageResult?.rows ?? [];
  let total = pageResult?.total ?? 0;
  let { sectors, cities, totalAll } = meta;

  // No real data yet → fall back to bundled sample startups.
  if (totalAll === 0 && (!pageResult || pageResult.total === 0)) {
    const all = DUMMY_STARTUPS.map((s) => ({ ...s })) as unknown as DirectoryRow[];
    const res = inMemory(all, filters, page);
    rows = res.rows;
    total = res.total;
    sectors = Array.from(
      new Set(all.map((r) => r.primary_industry).filter((s): s is string => !isMissing(s)))
    ).sort();
    cities = Array.from(
      new Set(
        all
          .map((r) => r.city)
          .filter((s): s is string => !isMissing(s))
          .map((s) => s.trim())
      )
    ).sort();
    totalAll = all.length;
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <DirectoryHero totalStartups={totalAll} sectorCount={sectors.length} />
        <section className="bg-white border-t border-pasha-line">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 py-12 sm:py-16">
            {/* useSearchParams in the client needs a Suspense boundary; route
                transitions reuse the existing UI so the fallback only shows on
                the very first paint. */}
            <Suspense fallback={<div className="text-pasha-muted">Loading…</div>}>
              <DirectoryClient
                rows={rows}
                total={total}
                totalAll={totalAll}
                sectors={sectors}
                cities={cities}
                filters={filters}
                page={page}
                pageSize={PAGE_SIZE}
              />
            </Suspense>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
