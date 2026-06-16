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
  "id,startup_name,tagline,primary_industry,city,logo_url,current_revenue,total_employees,female_employees,number_of_customers,pasha_verified,product_stage,incubation_stage";

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

export async function getFeaturedForAdmin() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("featured_startups")
    .select(FEATURED_SELECT)
    .order("featured_from", { ascending: false });

  if (error) {
    if (/featured_startups|does not exist/i.test(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }
  return data ?? [];
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
};

function toWatchlistStartup(s: DatabankFeatured): WatchlistStartup {
  return {
    id: s.id,
    startup_name: s.startup_name,
    tagline: s.tagline,
    primary_industry: s.primary_industry,
    city: s.city,
    product_stage: stageLabel(s.product_stage, s.incubation_stage),
    pasha_verified: s.pasha_verified,
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
