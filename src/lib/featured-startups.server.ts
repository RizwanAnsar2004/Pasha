import { createServiceClient } from "@/lib/supabase/server";
import type { FeaturedStartup } from "@/components/landing/FeaturedStartups";
import type { WatchlistStartup } from "@/components/landing/VerifiedStartupsToWatch";

export type FeaturedSettings = {
  auto_rotate: boolean;
  show_on_homepage: boolean;
  show_on_directory: boolean;
  show_in_search: boolean;
};

const DATABANK_COLS =
  "id,startup_name,tagline,primary_industry,city,logo_url,current_revenue,total_employees,female_employees,number_of_customers,pasha_verified,product_stage,incubation_stage,answers";

const DEFAULT_SETTINGS: FeaturedSettings = {
  auto_rotate: true,
  show_on_homepage: true,
  show_on_directory: true,
  show_in_search: false,
};

const FEATURED_SELECT = `id,featured_from,featured_until,created_at,databank:databank_id (${DATABANK_COLS})`;

export async function getFeaturedSettings(): Promise<FeaturedSettings> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("featured_startup_settings")
    .select("auto_rotate,show_on_homepage,show_on_directory,show_in_search")
    .eq("id", true)
    .maybeSingle();

  if (error || !data) return DEFAULT_SETTINGS;
  return data as FeaturedSettings;
}

export async function getFeaturedForAdmin(
  range?: { from: number; to: number },
  filters?: { q?: string; status?: string }
): Promise<{ rows: unknown[]; total: number }> {
  const supabase = createServiceClient();
  const q = (filters?.q ?? "").trim();
  const status = filters?.status ?? "all";
  // Inner-join databank when searching so the postgrest filter on the joined
  // table also restricts the parent rows (otherwise unmatched rows still come
  // back with databank: null).
  const select = q.length >= 1
    ? `id,featured_from,featured_until,created_at,databank:databank_id!inner (${DATABANK_COLS})`
    : FEATURED_SELECT;

  let query = supabase
    .from("featured_startups")
    .select(select, { count: "exact" })
    .order("featured_from", { ascending: false });

  if (q.length >= 1) {
    const p = `%${q}%`;
    query = query.or(
      `startup_name.ilike.${p},primary_industry.ilike.${p},city.ilike.${p}`,
      { foreignTable: "databank" }
    );
  }

  const now = new Date().toISOString();
  if (status === "active") {
    query = query.lte("featured_from", now).gte("featured_until", now);
  } else if (status === "scheduled") {
    query = query.gt("featured_from", now);
  } else if (status === "expired") {
    query = query.lt("featured_until", now);
  }

  if (range) query = query.range(range.from, range.to);

  const { data, count, error } = await query;

  if (error) {
    if (/featured_startups|does not exist/i.test(error.message)) {
      return { rows: [], total: 0 };
    }
    throw new Error(error.message);
  }
  return { rows: data ?? [], total: count ?? 0 };
}

function databankOfJoin(
  databank: FeaturedStartup | FeaturedStartup[] | null | undefined
): FeaturedStartup | null {
  if (!databank) return null;
  return Array.isArray(databank) ? databank[0] ?? null : databank;
}

export async function getActiveFeaturedStartups(now = new Date()): Promise<{
  settings: FeaturedSettings;
  startups: FeaturedStartup[];
}> {
  const settings = await getFeaturedSettings();
  const supabase = createServiceClient();
  const iso = now.toISOString();

  const { data, error } = await supabase
    .from("featured_startups")
    .select(FEATURED_SELECT)
    .lte("featured_from", iso)
    .gte("featured_until", iso)
    .order("featured_from", { ascending: false });

  if (error) {
    if (/featured_startups|does not exist/i.test(error.message)) {
      return { settings, startups: [] };
    }
    throw new Error(error.message);
  }

  const startups = (data ?? [])
    .map((row) => databankOfJoin(row.databank as FeaturedStartup | FeaturedStartup[] | null))
    .filter((s): s is FeaturedStartup => s !== null);

  return { settings, startups };
}

type DatabankFeatured = FeaturedStartup & {
  product_stage?: string | null;
  incubation_stage?: string | null;
  answers?: Record<string, unknown> | null;
};

// The cover image is an admin-defined form field with no column_map, so it lives
// in the answers JSONB bag (mirrored onto databank.answers on approval).
function coverFromAnswers(answers: Record<string, unknown> | null | undefined): string | null {
  const v = answers?.cover_image;
  return typeof v === "string" && v.trim() ? v : null;
}

function toWatchlistStartup(s: DatabankFeatured): WatchlistStartup {
  return {
    id: s.id,
    startup_name: s.startup_name,
    tagline: s.tagline,
    primary_industry: s.primary_industry,
    city: s.city,
    product_stage: stageLabel(s.product_stage, s.incubation_stage),
    pasha_verified: s.pasha_verified,
    logo_url: s.logo_url ?? null,
    cover_image: coverFromAnswers(s.answers),
  };
}

export async function getHomepageFeaturedWatchlist(): Promise<WatchlistStartup[]> {
  try {
    const { settings, startups } = await getActiveFeaturedStartups();
    if (!settings.show_on_homepage) return [];
    return (startups as DatabankFeatured[]).map(toWatchlistStartup);
  } catch {
    return [];
  }
}

/**
 * P@SHA-verified startups for the homepage "Verified Startups to Watch"
 * carousel. Capped (default 20) so the homepage makes one small query instead
 * of pulling the whole databank.
 */
export async function getHomepageVerifiedWatchlist(limit = 20): Promise<WatchlistStartup[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("databank")
      .select(DATABANK_COLS)
      .eq("pasha_verified", true)
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) return [];
    return (data as DatabankFeatured[] | null ?? []).map(toWatchlistStartup);
  } catch {
    return [];
  }
}

export function isWomenLed(
  femaleEmployees: number | null | undefined,
  totalEmployees: number | null | undefined
) {
  if (!femaleEmployees || !totalEmployees || totalEmployees <= 0) return false;
  return femaleEmployees / totalEmployees >= 0.5;
}

export function stageLabel(
  productStage: string | null | undefined,
  incubationStage: string | null | undefined
) {
  return productStage || incubationStage || null;
}

export type FeaturedStatus = {
  id: string;
  featured_from: string;
  featured_until: string;
  status: "active" | "scheduled" | "expired";
};

export async function getFeaturedStatusByDatabankId(
  databankId: string,
  now = new Date()
): Promise<FeaturedStatus | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("featured_startups")
    .select("id,featured_from,featured_until")
    .eq("databank_id", databankId)
    .maybeSingle();

  if (error) {
    if (/featured_startups|does not exist/i.test(error.message)) {
      return null;
    }
    throw new Error(error.message);
  }
  if (!data) return null;

  const from = new Date(data.featured_from);
  const until = new Date(data.featured_until);
  let status: FeaturedStatus["status"] = "active";
  if (until < now) status = "expired";
  else if (from > now) status = "scheduled";

  return {
    id: data.id,
    featured_from: data.featured_from,
    featured_until: data.featured_until,
    status,
  };
}
