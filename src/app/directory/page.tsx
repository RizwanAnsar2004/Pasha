import type { Metadata } from "next";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DirectoryClient } from "./DirectoryClient";
import type { DirectoryRow, DirectoryFilters } from "./DirectoryClient";
import { DirectoryTitle } from "@/components/directory/DirectoryTitle";
import { DirectorySkeleton } from "./DirectorySkeleton";
import { Kicker } from "@/components/landing/shared/Kicker";
import { PillButton } from "@/components/landing/shared/PillButton";
import { Reveal } from "@/components/landing/shared/Reveal";
import { createServiceClient } from "@/lib/supabase/server";
import { getFormOptionRegistry } from "@/lib/options/registry.server";
import { getOptionIndex } from "@/lib/options/index.server";
import { matchingOptionIds, optionFilterValues, type OptionIndex , optionIdFor} from "@/lib/options/resolve";
import type { OptionItem } from "@/lib/options/types";
import { DUMMY_STARTUPS } from "@/lib/constants/dummy-startups";

export const metadata: Metadata = {
  title: "Directory",
  description:
    "PASHA Startup Hub — browse 2,481 startups across cities and sectors. Maintained by the Pakistan Software Houses Association (PASHA).",
  alternates: { canonical: "/directory" },
  openGraph: {
    title: "Directory · PASHA Startup Hub",
    url: "/directory",
  },
  twitter: {
    title: "Directory · PASHA Startup Hub",
  },
};

// Reads searchParams (page + filters), so this route renders dynamically.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

// Card column set, richest first.
const SELECT_COLUMNS =
  "id,startup_name,tagline,startup_idea,primary_industry,nic_name,city,website,company_linkedin,logo_url,current_revenue,investment_raised,number_of_customers,total_employees,female_employees,pasha_verified,women_led,hiring,fundraising,founded_date,product_stage,business_types,incubation_stage,jobs_created,answers";
const SELECT_COLUMNS_FALLBACK =
  "id,startup_name,tagline,primary_industry,nic_name,city,website,logo_url,current_revenue,investment_raised,number_of_customers,total_employees,pasha_verified";

type SearchParams = Record<string, string | string[] | undefined>;

// The listing card only ever reads these two answer keys (range-band fallbacks for funding / customers).
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
    stage: str(sp.stage) || "all",
    verified: bool(sp.verified),
    womenLed: bool(sp.women_led),
    hiring: bool(sp.hiring),
    fundraising: bool(sp.fundraising),
    sort: str(sp.sort) || "featured",
  };
}

// PostgREST query builder is loosely typed across column sets; keep it untyped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, f: DirectoryFilters, index: OptionIndex) {
  // Match on the legacy text AND the equivalent option_id so filters survive the backfill.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchOption = (q: any, column: string, idColumn: string, type: string, param: string) => {
    const id = optionIdFor(index, type, param);
    if (id) return q.eq(idColumn, id);
    const values = optionFilterValues(index, type, param);
    if (values.length === 0) return q;
    return values.length === 1 ? q.eq(column, values[0]) : q.in(column, values);
  };
  if (f.sector !== "all") query = matchOption(query, "primary_industry", "primary_industry_id", "SECTORS", f.sector);
  if (f.city !== "all") query = matchOption(query, "city", "city_id", "HQ_CITIES", f.city);
  if (f.stage !== "all") query = matchOption(query, "product_stage", "product_stage_id", "STAGES", f.stage);
  if (f.verified) query = query.eq("pasha_verified", true);
  if (f.womenLed) query = query.eq("women_led", true);
  if (f.hiring) query = query.eq("hiring", true);
  if (f.fundraising) query = query.eq("fundraising", true);
  // Strip PostgREST `or()` delimiters from the user term, then match across the searchable text columns.
  const term = f.q.replace(/[%,()]/g, " ").trim();
  if (term) {
    const like = `%${term}%`;
    // Once the columns hold ids, ilike can no longer match a sector/city name — so
    const idMatches = matchingOptionIds(index, term).map((id) =>
      [`primary_industry_id.eq.${id}`, `city_id.eq.${id}`, `product_stage_id.eq.${id}`].join(",")
    );
    query = query.or(
      [
        `startup_name.ilike.${like}`,
        `tagline.ilike.${like}`,
        `primary_industry.ilike.${like}`,
        `nic_name.ilike.${like}`,
        `city.ilike.${like}`,
        ...idMatches,
      ].join(",")
    );
  }
  return query;
}

// Fetch ONE page of rows + the filtered total count in a single round-trip.
async function loadPage(
  filters: DirectoryFilters,
  page: number,
  index: OptionIndex
): Promise<{ rows: DirectoryRow[]; total: number } | null> {
  const supabase = createServiceClient();
  const offset = (page - 1) * PAGE_SIZE;

  for (const columns of [SELECT_COLUMNS, SELECT_COLUMNS_FALLBACK]) {
    let query = supabase.from("databank").select(columns, { count: "exact" });
    query = applyFilters(query, filters, index);
    if (filters.sort === "az") {
      query = query.order("startup_name", { ascending: true });
    } else if (filters.sort === "newest") {
      query = query.order("founded_date", { ascending: false, nullsFirst: false });
    } else if (filters.sort === "oldest") {
      query = query.order("founded_date", { ascending: true, nullsFirst: false });
    } else {
      // Featured (default): verified first, then newest, then revenue.
      query = query
        .order("pasha_verified", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false, nullsFirst: false })
        .order("current_revenue", { ascending: false, nullsFirst: false });
    }
    const { data, count, error } = await query.range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      // A missing column → retry with the more compatible set; otherwise bail.
      if (columns === SELECT_COLUMNS) continue;
      return null;
    }
    return { rows: stripAnswers((data ?? []) as unknown as DirectoryRow[]), total: count ?? 0 };
  }
  return null;
}

// The unfiltered total. Changes rarely, so cache for 5 minutes rather than
const getDirectoryMeta = unstable_cache(
  async (): Promise<{ totalAll: number }> => {
    const supabase = createServiceClient();
    const { count } = await supabase
      .from("databank")
      .select("id", { count: "exact", head: true });
    return { totalAll: count ?? 0 };
  },
  ["directory-meta-v3"],
  { revalidate: 300 }
);

// In-memory filter + paginate, used only for the bundled sample data when no real DB rows exist yet (dev / pre-seed).
function inMemory(
  all: DirectoryRow[],
  filters: DirectoryFilters,
  page: number,
  index: OptionIndex
): { rows: DirectoryRow[]; total: number } {
  const needle = filters.q.toLowerCase();
  const hits = (type: string, param: string, stored?: string | null) =>
    optionFilterValues(index, type, param).includes(String(stored ?? ""));
  const matched = all.filter((r) => {
    if (filters.sector !== "all" && !hits("SECTORS", filters.sector, r.primary_industry)) return false;
    if (filters.city !== "all" && !hits("HQ_CITIES", filters.city, r.city)) return false;
    if (filters.stage !== "all" && !hits("STAGES", filters.stage, r.product_stage)) return false;
    if (filters.verified && !r.pasha_verified) return false;
    if (filters.womenLed && !r.women_led) return false;
    if (filters.hiring && !r.hiring) return false;
    if (filters.fundraising && !r.fundraising) return false;
    if (!needle) return true;
    const hay = [r.startup_name, r.primary_industry, r.nic_name, r.city]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });
  if (filters.sort === "az") {
    matched.sort((a, b) => a.startup_name.localeCompare(b.startup_name));
  } else if (filters.sort === "newest" || filters.sort === "oldest") {
    matched.sort((a, b) => {
      const at = a.founded_date ? new Date(a.founded_date).getTime() : 0;
      const bt = b.founded_date ? new Date(b.founded_date).getTime() : 0;
      return filters.sort === "newest" ? bt - at : at - bt;
    });
  }
  const offset = (page - 1) * PAGE_SIZE;
  return { rows: matched.slice(offset, offset + PAGE_SIZE), total: matched.length };
}

type DirectoryData = {
  rows: DirectoryRow[];
  total: number;
  totalAll: number;
  sectors: OptionItem[];
  cities: OptionItem[];
  stages: OptionItem[];
  fundingBands: OptionItem[];
  optionIndex: OptionIndex;
};

// Everything the listing needs; the two index-independent queries start first.
async function loadDirectory(filters: DirectoryFilters, page: number): Promise<DirectoryData> {
  const metaPromise = getDirectoryMeta();
  const registryPromise = getFormOptionRegistry();

  const optionIndex = await getOptionIndex();
  const [pageResult, meta, optionRegistry] = await Promise.all([
    loadPage(filters, page, optionIndex),
    metaPromise,
    registryPromise,
  ]);

  let rows = pageResult?.rows ?? [];
  let total = pageResult?.total ?? 0;
  let { totalAll } = meta;

  // Dropdown options come from the single source of truth, not from the rows on
  const sectors = optionRegistry.SECTORS ?? [];
  const cities = optionRegistry.HQ_CITIES ?? [];
  const stages = optionRegistry.STAGES ?? [];

  // No real data yet → fall back to bundled sample startups. The dropdowns are
  if (totalAll === 0 && (!pageResult || pageResult.total === 0)) {
    const all = DUMMY_STARTUPS.map((s) => ({ ...s })) as unknown as DirectoryRow[];
    const res = inMemory(all, filters, page, optionIndex);
    rows = res.rows;
    total = res.total;
    totalAll = all.length;
  }

  return {
    rows,
    total,
    totalAll,
    sectors,
    cities,
    stages,
    fundingBands: optionRegistry.FUNDING_AMOUNT_RANGES ?? [],
    optionIndex,
  };
}

// Suspends until the queries land; the shell around it is already on screen.
async function DirectoryResults({
  data,
  filters,
  page,
}: {
  data: Promise<DirectoryData>;
  filters: DirectoryFilters;
  page: number;
}) {
  const d = await data;
  return (
    <DirectoryClient
      rows={d.rows}
      total={d.total}
      totalAll={d.totalAll}
      sectors={d.sectors}
      cities={d.cities}
      stages={d.stages}
      fundingBands={d.fundingBands}
      optionIndex={d.optionIndex}
      filters={filters}
      page={page}
      pageSize={PAGE_SIZE}
    />
  );
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

  // Deliberately NOT awaited: kicking the work off and handing the promise to
  // the Suspense boundary lets the header/title/footer flush immediately, then
  // the card grid streams in as the query resolves.
  const data = loadDirectory(filters, page);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-pasha-stone">
        <DirectoryTitle />
        <section id="directory" className="py-16 sm:py-16">
          <div className="site-container">
            {/* Also the boundary useSearchParams in DirectoryClient requires. */}
            <Suspense fallback={<DirectorySkeleton cards={PAGE_SIZE} />}>
              <DirectoryResults data={data} filters={filters} page={page} />
            </Suspense>
          </div>
        </section>

        <section className="bg-white py-14 sm:py-20">
          <div className="site-container">
            <Reveal className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-pasha-ink to-[#2e2a27] px-7 py-10 sm:px-12 sm:py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
              <span
                aria-hidden
                className="pointer-events-none absolute -right-4 -top-24 select-none font-serif font-black leading-none text-white/[0.04]"
                style={{ fontSize: "19rem" }}
              >
                @
              </span>
              <div className="relative">
                <Kicker tone="light" className="text-pasha-red-light">
                  Not listed yet?
                </Kicker>
                <h2 className="mt-4 font-serif text-2xl sm:text-4xl lg:text-[3.5rem] font-extrabold leading-[0.98] tracking-tight text-white">
                  Make your startup easier to find, understand and trust.
                </h2>
                <p className="mt-4 max-w-md text-white/55 text-base leading-relaxed">
                  Create a verified profile for buyers, investors, partners and ecosystem opportunities.
                </p>
              </div>
              <PillButton href="/apply" variant="solid" dot={false} className="relative shrink-0">
                Register Your Startup
              </PillButton>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
