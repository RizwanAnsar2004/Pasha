import "server-only";

// Key shape: pasha:v1:<namespace>:g<generation>:f:<filters>:s:<sort>:p:<page>
// Segments stay plain text — a key is readable in redis-cli and needs no hashing dependency.
export const CACHE_PREFIX = "pasha";
export const CACHE_SCHEMA_VERSION = "v1";

export const CACHE_NS = {
  womenLed: "women-led",
  awards: "admin:awards",
  committeeActivity: "admin:committee-activity",
  committeeMembers: "admin:committee-members",
  databank: "admin:databank",
  emailTemplates: "admin:email-templates",
  events: "admin:events",
  featuredStartups: "admin:featured-startups",
  forms: "admin:forms",
  optionLists: "admin:option-lists",
  siteContent: "admin:site-content",
  submission: "admin:submission",
  superAdmins: "super-admin:admins",
} as const;

export type CacheNamespace = (typeof CACHE_NS)[keyof typeof CACHE_NS];

// TTL is only the safety net — correctness comes from explicit invalidation on write.
export const CACHE_TTL: Record<CacheNamespace, number> = {
  [CACHE_NS.womenLed]: 300,
  [CACHE_NS.awards]: 300,
  [CACHE_NS.committeeActivity]: 60,
  [CACHE_NS.committeeMembers]: 300,
  [CACHE_NS.databank]: 120,
  [CACHE_NS.emailTemplates]: 600,
  [CACHE_NS.events]: 300,
  [CACHE_NS.featuredStartups]: 300,
  [CACHE_NS.forms]: 600,
  [CACHE_NS.optionLists]: 900,
  [CACHE_NS.siteContent]: 900,
  [CACHE_NS.submission]: 60,
  [CACHE_NS.superAdmins]: 300,
};

// Writing one dataset stales others — a databank edit changes the women-led and featured lists.
export const CACHE_INVALIDATES: Partial<Record<CacheNamespace, CacheNamespace[]>> = {
  [CACHE_NS.databank]: [CACHE_NS.womenLed, CACHE_NS.featuredStartups, CACHE_NS.submission, CACHE_NS.awards],
  [CACHE_NS.submission]: [CACHE_NS.databank, CACHE_NS.womenLed, CACHE_NS.featuredStartups],
  [CACHE_NS.awards]: [CACHE_NS.databank],
  [CACHE_NS.featuredStartups]: [CACHE_NS.databank],
  [CACHE_NS.committeeMembers]: [CACHE_NS.committeeActivity],
  [CACHE_NS.optionLists]: [CACHE_NS.forms, CACHE_NS.databank, CACHE_NS.submission],
  [CACHE_NS.forms]: [CACHE_NS.optionLists],
};

const root = `${CACHE_PREFIX}:${CACHE_SCHEMA_VERSION}`;

// Returns the namespace itself plus everything a write to it also stales.
export function invalidationTargets(ns: CacheNamespace): CacheNamespace[] {
  return [ns, ...(CACHE_INVALIDATES[ns] ?? [])];
}

// Counter key whose value is baked into every entry key of the namespace.
export function generationKey(ns: CacheNamespace): string {
  return `${root}:${ns}:__gen`;
}

// Params that select rows vs. slice them — kept apart so each composes into its own key segment.
const PAGINATION_PARAMS = new Set(["page", "pageSize", "limit", "offset", "cursor", "all"]);
const SORT_PARAMS = new Set(["sort", "sortBy", "order", "orderBy", "dir", "direction"]);

// Collapses a param list to a canonical `k=v` string; order-independent, blanks dropped.
function canonical(params: URLSearchParams, pick: (key: string) => boolean): string {
  const pairs: string[] = [];
  for (const [k, v] of params.entries()) {
    if (!pick(k)) continue;
    const value = v.trim();
    if (value === "") continue; // an empty filter must key the same as an absent one
    pairs.push(`${k}=${value}`);
  }
  pairs.sort(); // ?page=2&q=ai and ?q=ai&page=2 are the same query
  return pairs.join("&");
}

// Escapes the key delimiter and whitespace so a segment can never split the key.
function segment(canonicalised: string, emptyLabel: string): string {
  if (canonicalised === "") return emptyLabel;
  return canonicalised.replace(/[:\s]/g, "_");
}

export type QuerySegments = { filters: string; sort: string; page: string };

// Splits a querystring into its three independent dimensions, so the same filter set
// under a different page — or the same page under a different filter set — is a distinct entry.
export function querySegments(params: URLSearchParams): QuerySegments {
  const isPage = (k: string) => PAGINATION_PARAMS.has(k);
  const isSort = (k: string) => SORT_PARAMS.has(k);

  return {
    filters: segment(canonical(params, (k) => !isPage(k) && !isSort(k)), "nofilter"),
    sort: segment(canonical(params, isSort), "nosort"),
    // `all=1` exports every row and ignores page/pageSize — give it one shared entry.
    page: params.get("all") === "1" ? "all" : segment(canonical(params, isPage), "p1"),
  };
}

// Assembles the full entry key from namespace, live generation and the three query segments.
export function entryKey(args: { ns: CacheNamespace; generation: number; query: QuerySegments }): string {
  const { ns, generation, query } = args;
  return `${root}:${ns}:g${generation}:f:${query.filters}:s:${query.sort}:p:${query.page}`;
}
