import { createServiceClient } from "@/lib/supabase/server";
import { startupSlug } from "@/lib/slug";
import type { WomenLedStartup } from "@/lib/women-led";

export type { WomenLedStartup } from "@/lib/women-led";

type KeyPerson = { name?: string; gender?: string; [key: string]: unknown };

type DatabankRow = {
  id: string;
  startup_name: string;
  primary_industry?: string | null;
  key_persons?: unknown;
};

const LIST_COLS = "id,startup_name,primary_industry,key_persons";

function founderNameFromKeyPersons(keyPersons: unknown): string | null {
  if (!Array.isArray(keyPersons)) return null;
  const woman = keyPersons.find(
    (p) => typeof p === "object" && p !== null && (p as KeyPerson).gender?.toLowerCase() === "female"
  ) as KeyPerson | undefined;
  if (woman?.name) return woman.name;
  const first = keyPersons.find((p) => typeof p === "object" && p !== null && (p as KeyPerson).name) as
    | KeyPerson
    | undefined;
  return first?.name ?? null;
}

function toWomenLedStartup(row: DatabankRow): WomenLedStartup {
  return {
    id: row.id,
    startup_name: row.startup_name,
    founder_name: founderNameFromKeyPersons(row.key_persons),
    primary_industry: row.primary_industry,
    slug: startupSlug(row.startup_name, row.id),
  };
}

function isMissingWomenLedColumn(msg: string) {
  return /women_led|does not exist/i.test(msg);
}

export async function getWomenLedStartups(limit = 5): Promise<{
  startups: WomenLedStartup[];
  totalCount: number;
}> {
  try {
    const supabase = createServiceClient();

    const { count, error: countError } = await supabase
      .from("databank")
      .select("*", { count: "exact", head: true })
      .eq("women_led", true);

    if (countError) {
      if (isMissingWomenLedColumn(countError.message)) {
        return { startups: [], totalCount: 0 };
      }
      throw new Error(countError.message);
    }

    const { data, error } = await supabase
      .from("databank")
      .select(LIST_COLS)
      .eq("women_led", true)
      .order("pasha_verified", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      if (isMissingWomenLedColumn(error.message)) {
        return { startups: [], totalCount: 0 };
      }
      throw new Error(error.message);
    }

    return {
      startups: (data ?? []).map((row) => toWomenLedStartup(row as DatabankRow)),
      totalCount: count ?? 0,
    };
  } catch {
    return { startups: [], totalCount: 0 };
  }
}
