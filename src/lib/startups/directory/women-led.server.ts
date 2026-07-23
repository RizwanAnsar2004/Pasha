import { createServiceClient } from "@/lib/supabase/server";
import { startupSlug } from "@/lib/utils/slug";
import type { WomenLedStartup } from "@/lib/startups/directory/women-led";
import { getOptionIndex } from "@/lib/options/index.server";
import { resolveChoiceLabel, resolveOptionLabel, resolveOptionValue, type OptionIndex } from "@/lib/options/resolve";

export type { WomenLedStartup } from "@/lib/startups/directory/women-led";

type KeyPerson = { name?: string; gender?: string; mobile?: string; [key: string]: unknown };

type DatabankRow = {
  id: string;
  startup_name: string;
  primary_industry?: string | null;
  city?: string | null;
  tagline?: string | null;
  product_stage?: string | null;
  contact_email?: string | null;
  website?: string | null;
  logo_url?: string | null;
  answers?: Record<string, unknown> | null;
  key_persons?: unknown;
};

const LIST_COLS =
  "id,startup_name,primary_industry,city,tagline,product_stage,contact_email,website,logo_url,answers,key_persons";

// Cover image is an admin-defined form field (no column_map), so it lives in the
function coverFromAnswers(answers: Record<string, unknown> | null | undefined): string | null {
  const v = answers?.cover_image;
  return typeof v === "string" && v.trim() ? v : null;
}

// key_persons.gender may hold an option id (admin editor) or legacy text.
function isFemale(person: unknown, index: OptionIndex): boolean {
  if (typeof person !== "object" || person === null) return false;
  const raw = (person as KeyPerson).gender;
  return resolveOptionValue(index, raw ?? null)?.toLowerCase() === "female";
}

function founderNameFromKeyPersons(keyPersons: unknown, index: OptionIndex): string | null {
  if (!Array.isArray(keyPersons)) return null;
  const woman = keyPersons.find((p) => isFemale(p, index)) as KeyPerson | undefined;
  if (woman?.name) return woman.name;
  const first = keyPersons.find((p) => typeof p === "object" && p !== null && (p as KeyPerson).name) as
    | KeyPerson
    | undefined;
  return first?.name ?? null;
}

function founderMobileFromKeyPersons(keyPersons: unknown, index: OptionIndex): string | null {
  if (!Array.isArray(keyPersons)) return null;
  const woman = keyPersons.find((p) => isFemale(p, index)) as KeyPerson | undefined;
  if (woman?.mobile) return woman.mobile;
  const first = keyPersons.find((p) => typeof p === "object" && p !== null && (p as KeyPerson).mobile) as
    | KeyPerson
    | undefined;
  return first?.mobile ?? null;
}

function toWomenLedStartup(row: DatabankRow, index: OptionIndex): WomenLedStartup {
  return {
    id: row.id,
    startup_name: row.startup_name,
    founder_name: founderNameFromKeyPersons(row.key_persons, index),
    founder_mobile: founderMobileFromKeyPersons(row.key_persons, index),
    // "Other" is never shown publicly — swap in the applicant's own words.
    primary_industry: resolveChoiceLabel(index, "SECTORS", row.primary_industry, row.answers?.primary_sector_other),
    city: resolveChoiceLabel(index, "HQ_CITIES", row.city, row.answers?.hq_other),
    tagline: row.tagline,
    product_stage: resolveChoiceLabel(index, "STAGES", row.product_stage, row.answers?.stage_other),
    contact_email: row.contact_email,
    website: row.website,
    logo_url: row.logo_url ?? null,
    cover_image: coverFromAnswers(row.answers),
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

    const index = await getOptionIndex();
    return {
      startups: (data ?? []).map((row) => toWomenLedStartup(row as DatabankRow, index)),
      totalCount: count ?? 0,
    };
  } catch {
    return { startups: [], totalCount: 0 };
  }
}
