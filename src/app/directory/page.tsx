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
import { isOptionId, matchingOptionIds, optionFilterValues, type OptionIndex , optionIdFor} from "@/lib/options/resolve";
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
    featured: bool(sp.featured),
    awarded: bool(sp.awarded),
    sort: str(sp.sort) || "featured",
  };
}

// "Featured" and "Award-winning" are curation tables keyed by databank_id, not
// databank columns — resolve them to an id set the main query can filter on.
// null → neither filter is active; [] → filter active but nothing qualifies.
async function curatedIdFilter(f: DirectoryFilters): Promise<string[] | null> {
  if (!f.featured && !f.awarded) return null;
  const supabase = createServiceClient();
  const idsOf = (rows: { databank_id?: string | null }[] | null) =>
    new Set((rows ?? []).map((r) => r.databank_id).filter((v): v is string => !!v));

  const sets: Set<string>[] = [];
  if (f.featured) {
    const iso = new Date().toISOString();
    // Only currently-live features count — the same window the homepage uses.
    const { data } = await supabase
      .from("featured_startups")
      .select("databank_id")
      .lte("featured_from", iso)
      .gte("featured_until", iso)
      .limit(MAX_CURATED_IDS);
    sets.push(idsOf(data));
  }
  if (f.awarded) {
    const { data } = await supabase
      .from("startup_awards")
      .select("databank_id")
      .limit(MAX_CURATED_IDS);
    sets.push(idsOf(data));
  }

  // Both chips on → startups that are featured AND have an award.
  const [first, ...rest] = sets;
  const result = [...first].filter((id) => rest.every((s) => s.has(id)));
  return result;
}

// Guards the PostgREST `in.(…)` URL length; the curated tables are far smaller.
const MAX_CURATED_IDS = 2000;

// Free-text companions to the "Other" choice, kept searchable so a startup that
// typed its own city/sector is still findable by that word.
const OTHER_ANSWER_KEYS = ["hq_other", "primary_sector_other", "stage_other", "nic_name_other"] as const;

// Filter params for a value nobody put in the option lists — a city or sector a
// startup typed under "Other". Prefixed so it can never collide with an option
// value or id, and so applyFilters knows to match the free text instead.
const OTHER_PREFIX = "other:";
const unlistedValue = (param: string) =>
  param.startsWith(OTHER_PREFIX) ? param.slice(OTHER_PREFIX.length) : null;

// A city column that resolves to nothing in HQ_CITIES, or a sector free-text
// answer, is a real value the dropdowns would otherwise hide. Collect them so
// they can be offered as filter entries. Cheap enough to cache for 5 minutes.
const getUnlistedFilterValues = unstable_cache(
  async (): Promise<{ cities: string[]; sectors: string[]; stages: string[] }> => {
    const supabase = createServiceClient();
    const index = await getOptionIndex();
    const known = new Set(
      Object.values(index.byId).flatMap((o) => [o.value.toLowerCase(), o.label.toLowerCase()])
    );
    const cities = new Map<string, string>();
    const sectors = new Map<string, string>();
    const stages = new Map<string, string>();

    const add = (into: Map<string, string>, raw: unknown) => {
      const v = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
      if (!v || v.toLowerCase() === "other") return;
      if (!into.has(v.toLowerCase())) into.set(v.toLowerCase(), v);
    };

    // Paged: PostgREST caps a single response, and the table is ~2.5k rows.
    for (let from = 0; from < 10000; from += 1000) {
      const { data, error } = await supabase
        .from("databank")
        .select("city,primary_industry,product_stage,answers")
        .range(from, from + 999);
      if (error || !data) break;
      type Row = {
        city?: string | null;
        primary_industry?: string | null;
        product_stage?: string | null;
        answers?: Record<string, unknown> | null;
      };
      for (const row of data as Row[]) {
        // Unknown to the option lists → it came from a free-text "Other". City
        // is the case that already happens: approval writes the typed value
        // straight into the column.
        const unknownIn = (v: string | null | undefined) => {
          const raw = (v ?? "").trim();
          if (!raw) return null;
          // A UUID is an option id, not something a human typed — a dead id must
          // never surface in a dropdown as a filter entry.
          const looksLikeId: boolean = isOptionId(raw);
          if (looksLikeId || index.byId[raw]) return null;
          return known.has(raw.toLowerCase()) ? null : raw;
        };
        add(cities, unknownIn(row.city));
        add(sectors, unknownIn(row.primary_industry));
        add(stages, unknownIn(row.product_stage));
        // …and the case where the choice stayed "Other" and the words went to
        // the answers bag.
        add(sectors, row.answers?.primary_sector_other);
        add(cities, row.answers?.hq_other);
        add(stages, row.answers?.stage_other);
      }
      if (data.length < 1000) break;
    }

    const sort = (m: Map<string, string>) => [...m.values()].sort((a, b) => a.localeCompare(b));
    return { cities: sort(cities), sectors: sort(sectors), stages: sort(stages) };
  },
  ["directory-unlisted-values-v1"],
  { revalidate: 300 }
);

// "Other" is a data-entry affordance, not a browsable category — drop it from
// the public dropdowns and offer the actual typed values instead.
function publicOptions(items: OptionItem[], unlisted: string[]): OptionItem[] {
  const listed = items.filter((o) => !o.isOther && o.label.trim().toLowerCase() !== "other");
  return [...listed, ...unlisted.map((v) => ({ value: `${OTHER_PREFIX}${v}`, label: v }))];
}

// PostgREST query builder is loosely typed across column sets; keep it untyped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(
  query: any,
  f: DirectoryFilters,
  index: OptionIndex,
  curatedIds: string[] | null,
  // Only on the rich column pass — deployments still on the legacy schema have
  // no `answers` column, and a filter on it would error the whole query.
  searchAnswers = true
) {
  if (curatedIds) query = query.in("id", curatedIds);
  // Match on the legacy text AND the equivalent option_id so filters survive the backfill.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchOption = (q: any, column: string, idColumn: string, type: string, param: string) => {
    const id = optionIdFor(index, type, param);
    if (id) return q.eq(idColumn, id);
    const values = optionFilterValues(index, type, param);
    if (values.length === 0) return q;
    return values.length === 1 ? q.eq(column, values[0]) : q.in(column, values);
  };
  // An `other:` param is free text the applicant typed. It lands in one of two
  // places depending on the field: written straight into the column (what
  // approval does for city), or left in the answers bag beside an "Other"
  // choice. Match either.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchUnlisted = (q: any, column: string, answerKey: string, text: string) => {
    const safe = text.replace(/"/g, "");
    const clauses = [`${column}.eq."${safe}"`];
    if (searchAnswers) clauses.push(`answers->>${answerKey}.eq."${safe}"`);
    return q.or(clauses.join(","));
  };

  const facet = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    q: any,
    param: string,
    column: string,
    idColumn: string,
    type: string,
    answerKey: string
  ) => {
    if (param === "all") return q;
    const text = unlistedValue(param);
    return text
      ? matchUnlisted(q, column, answerKey, text)
      : matchOption(q, column, idColumn, type, param);
  };

  query = facet(query, f.sector, "primary_industry", "primary_industry_id", "SECTORS", "primary_sector_other");
  query = facet(query, f.city, "city", "city_id", "HQ_CITIES", "hq_other");
  query = facet(query, f.stage, "product_stage", "product_stage_id", "STAGES", "stage_other");
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
    // A startup that picked "Other" stores the real value as free text in
    // `answers` (city → hq_other, sector → primary_sector_other, …). Without
    // these, searching "Layyah" can never find the startup that typed it.
    const otherMatches = searchAnswers
      ? OTHER_ANSWER_KEYS.map((k) => `answers->>${k}.ilike.${like}`)
      : [];
    query = query.or(
      [
        `startup_name.ilike.${like}`,
        `tagline.ilike.${like}`,
        `primary_industry.ilike.${like}`,
        `nic_name.ilike.${like}`,
        `city.ilike.${like}`,
        ...otherMatches,
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

  const curatedIds = await curatedIdFilter(filters);
  // An active curated filter that matches nothing → no rows, without a query.
  if (curatedIds && curatedIds.length === 0) return { rows: [], total: 0 };

  for (const columns of [SELECT_COLUMNS, SELECT_COLUMNS_FALLBACK]) {
    let query = supabase.from("databank").select(columns, { count: "exact" });
    query = applyFilters(query, filters, index, curatedIds, columns === SELECT_COLUMNS);
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
    const same = (stored: string | null | undefined, text: string) =>
      (stored ?? "").trim().toLowerCase() === text.toLowerCase();
    const facetOk = (param: string, type: string, stored: string | null | undefined) => {
      if (param === "all") return true;
      const text = unlistedValue(param);
      return text ? same(stored, text) : hits(type, param, stored);
    };
    if (!facetOk(filters.sector, "SECTORS", r.primary_industry)) return false;
    if (!facetOk(filters.city, "HQ_CITIES", r.city)) return false;
    if (!facetOk(filters.stage, "STAGES", r.product_stage)) return false;
    if (filters.verified && !r.pasha_verified) return false;
    if (filters.womenLed && !r.women_led) return false;
    if (filters.hiring && !r.hiring) return false;
    if (filters.fundraising && !r.fundraising) return false;
    // The sample set has no curation tables behind it — awards fall back to the
    // legacy text column, and nothing is ever "featured".
    if (filters.awarded && !(r as { awards?: string | null }).awards) return false;
    if (filters.featured) return false;
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
  const [pageResult, meta, optionRegistry, unlisted] = await Promise.all([
    loadPage(filters, page, optionIndex),
    metaPromise,
    registryPromise,
    getUnlistedFilterValues(),
  ]);

  let rows = pageResult?.rows ?? [];
  let total = pageResult?.total ?? 0;
  let { totalAll } = meta;

  // Dropdown options come from the single source of truth, plus the values that
  // only exist as free text behind an "Other" pick (which itself is hidden).
  const sectors = publicOptions(optionRegistry.SECTORS ?? [], unlisted.sectors);
  const cities = publicOptions(optionRegistry.HQ_CITIES ?? [], unlisted.cities);
  const stages = publicOptions(optionRegistry.STAGES ?? [], unlisted.stages);

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
