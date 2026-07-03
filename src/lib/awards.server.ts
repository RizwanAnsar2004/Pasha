import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type { AwardWinningStartup } from "@/components/landing/AwardWinningStartups";

// One admin-curated award joined to its databank startup.
export type AwardRow = {
  id: string;
  databank_id: string;
  title: string;
  year: number | null;
  sort_order: number;
  created_at: string;
  source: string;
  startup_name: string | null;
  primary_industry: string | null;
  city: string | null;
  pasha_verified: boolean | null;
};

export type AwardSourceFilter = "all" | "submission" | "manual";

const JOIN_SELECT =
  "id,databank_id,title,year,sort_order,created_at,source,databank:databank_id!inner(startup_name,primary_industry,city,pasha_verified)";

type JoinShape = {
  id: string;
  databank_id: string;
  title: string;
  year: number | null;
  sort_order: number;
  created_at: string;
  source: string;
  databank:
    | {
        startup_name: string | null;
        primary_industry: string | null;
        city: string | null;
        pasha_verified: boolean | null;
      }
    | {
        startup_name: string | null;
        primary_industry: string | null;
        city: string | null;
        pasha_verified: boolean | null;
      }[]
    | null;
};

function flatten(r: JoinShape): AwardRow {
  const d = Array.isArray(r.databank) ? r.databank[0] : r.databank;
  return {
    id: r.id,
    databank_id: r.databank_id,
    title: r.title,
    year: r.year,
    sort_order: r.sort_order,
    created_at: r.created_at,
    source: r.source ?? "manual",
    startup_name: d?.startup_name ?? null,
    primary_industry: d?.primary_industry ?? null,
    city: d?.city ?? null,
    pasha_verified: d?.pasha_verified ?? null,
  };
}

/**
 * Curated award titles for a single startup, formatted as "Title (Year)" lines,
 * for the directory profile / admin view. Returns [] when none are curated —
 * callers fall back to the legacy databank.awards text.
 */
export async function getAwardTitlesForDatabank(databankId: string): Promise<string[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("startup_awards")
      .select("title, year, sort_order, created_at")
      .eq("databank_id", databankId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((r) => {
      const row = r as { title: string; year: number | null };
      return row.year ? `${row.title} (${row.year})` : row.title;
    });
  } catch {
    return [];
  }
}

/**
 * Paginated award entries for the admin tab. `q` searches the joined startup
 * name (server-side, inner join); `source` filters by origin. Returns rows +
 * total count for pagination.
 */
export async function getAwardsForAdmin(
  range?: { from: number; to: number },
  filters?: { q?: string; source?: string }
): Promise<{ rows: AwardRow[]; total: number }> {
  try {
    const supabase = createServiceClient();
    const q = (filters?.q ?? "").trim();
    const source = filters?.source ?? "all";

    let query = supabase
      .from("startup_awards")
      .select(JOIN_SELECT, { count: "exact" })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (source === "submission" || source === "manual") {
      query = query.eq("source", source);
    }
    if (q.length >= 1) {
      const p = `%${q}%`;
      query = query.or(
        `startup_name.ilike.${p},primary_industry.ilike.${p},city.ilike.${p}`,
        { foreignTable: "databank" }
      );
    }
    if (range) query = query.range(range.from, range.to);

    const { data, count, error } = await query;
    if (error) {
      if (/startup_awards|does not exist/i.test(error.message)) return { rows: [], total: 0 };
      throw new Error(error.message);
    }
    return { rows: (data as JoinShape[] | null)?.map(flatten) ?? [], total: count ?? 0 };
  } catch {
    return { rows: [], total: 0 };
  }
}

/**
 * Homepage award winners, shaped for <AwardWinningStartups>. Awards are grouped
 * by startup — one entry per startup, with all its award titles joined by
 * newline (the component renders each as its own chip). Verified startups
 * first. Returns [] on any error so the homepage falls back gracefully.
 */
export async function getHomepageAwardWinners(
  limit = 20
): Promise<AwardWinningStartup[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("startup_awards")
      .select(JOIN_SELECT)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) return [];
    const rows = (data as JoinShape[] | null)?.map(flatten) ?? [];

    // Group awards under their startup, preserving first-seen order.
    const byStartup = new Map<
      string,
      { row: AwardRow; titles: string[] }
    >();
    for (const r of rows) {
      if (!r.startup_name) continue;
      const title = r.year ? `${r.title} (${r.year})` : r.title;
      const existing = byStartup.get(r.databank_id);
      if (existing) existing.titles.push(title);
      else byStartup.set(r.databank_id, { row: r, titles: [title] });
    }

    return [...byStartup.values()]
      .sort((a, b) => Number(b.row.pasha_verified) - Number(a.row.pasha_verified))
      .slice(0, limit)
      .map(({ row, titles }) => ({
        id: row.databank_id,
        startup_name: row.startup_name as string,
        primary_industry: row.primary_industry,
        city: row.city,
        awards: titles.join("\n"),
        pasha_verified: row.pasha_verified,
      }));
  } catch {
    return [];
  }
}
