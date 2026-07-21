import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { OPTION_LISTS } from "./constants";
import { normalizeOptions } from "./normalize";
import type { OptionItem, OptionListMeta } from "./types";

const COUNTRIES = "COUNTRIES";

type OptionRow = { option_id: string; option_value: string; option_label: string; is_active: boolean };

// Every option list for the admin manager, sourced from the options/countries tables.
export async function getAdminOptionTypes(): Promise<OptionListMeta[]> {
  const supabase = createServiceClient();
  const byType = new Map<string, OptionListMeta>();

  const { data } = await supabase
    .from("options")
    .select("option_type, option_value, option_label, sort_order, is_active")
    .eq("is_active", true)
    .order("option_type", { ascending: true })
    .order("sort_order", { ascending: true });

  for (const r of (data ?? []) as unknown as (OptionRow & { option_type: string })[]) {
    const meta = byType.get(r.option_type) ?? { name: r.option_type, label: r.option_type, items: [], source: "db" };
    meta.items.push({ value: r.option_value, label: r.option_label });
    byType.set(r.option_type, meta);
  }

  const { data: countries } = await supabase
    .from("countries")
    .select("country_name, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (countries && countries.length > 0) {
    byType.set(COUNTRIES, {
      name: COUNTRIES,
      label: COUNTRIES,
      source: "db",
      items: (countries as { country_name: string }[]).map((c) => ({ value: c.country_name, label: c.country_name })),
    });
  }

  for (const [name, list] of Object.entries(OPTION_LISTS)) {
    if (!byType.has(name)) byType.set(name, { name, label: name, items: normalizeOptions(list), source: "code" });
  }

  return Array.from(byType.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// Upserts a whole list into the options table, deactivating anything removed, then re-links data rows.
export async function saveOptionType(type: string, items: OptionItem[]): Promise<void> {
  if (type === COUNTRIES) return saveCountries(items);

  const supabase = createServiceClient();
  const clean = normalizeOptions(items);

  const { data: existingRows } = await supabase
    .from("options")
    .select("option_id, option_value, option_label, is_active")
    .eq("option_type", type);
  const existing = new Map<string, OptionRow>();
  for (const r of (existingRows ?? []) as OptionRow[]) existing.set(r.option_value.trim().toLowerCase(), r);

  const keep = new Set<string>();
  for (let i = 0; i < clean.length; i++) {
    const item = clean[i];
    const key = item.value.trim().toLowerCase();
    keep.add(key);
    const row = existing.get(key);
    if (row) {
      await supabase
        .from("options")
        .update({ option_label: item.label, sort_order: i, is_active: true, updated_at: new Date().toISOString() })
        .eq("option_id", row.option_id);
    } else {
      await supabase
        .from("options")
        .insert({ option_type: type, option_value: item.value, option_label: item.label, sort_order: i });
    }
  }

  for (const [key, row] of existing) {
    if (!keep.has(key) && row.is_active) {
      await supabase.from("options").update({ is_active: false }).eq("option_id", row.option_id);
    }
  }

  await supabase.rpc("remap_option_type", { p_type: type });
}

// Soft-deletes an entire list by deactivating its rows.
export async function deleteOptionType(type: string): Promise<void> {
  if (type === COUNTRIES) return;
  const supabase = createServiceClient();
  await supabase.from("options").update({ is_active: false }).eq("option_type", type);
}

// Upserts the countries table and re-links hq_country rows.
async function saveCountries(items: OptionItem[]): Promise<void> {
  const supabase = createServiceClient();
  const clean = normalizeOptions(items);

  const { data: existingRows } = await supabase.from("countries").select("country_id, country_name, is_active");
  const existing = new Map<string, { country_id: string; is_active: boolean }>();
  for (const r of (existingRows ?? []) as { country_id: string; country_name: string; is_active: boolean }[]) {
    existing.set(r.country_name.trim().toLowerCase(), { country_id: r.country_id, is_active: r.is_active });
  }

  const keep = new Set<string>();
  for (let i = 0; i < clean.length; i++) {
    const key = clean[i].value.trim().toLowerCase();
    keep.add(key);
    const row = existing.get(key);
    if (row) {
      await supabase.from("countries").update({ sort_order: i, is_active: true }).eq("country_id", row.country_id);
    } else {
      await supabase.from("countries").insert({ country_name: clean[i].value, sort_order: i });
    }
  }
  for (const [key, row] of existing) {
    if (!keep.has(key) && row.is_active) {
      await supabase.from("countries").update({ is_active: false }).eq("country_id", row.country_id);
    }
  }

  for (const t of ["databank", "submissions"]) {
    const { data } = await supabase.from(t).select("id, hq_country").not("hq_country", "is", null).is("hq_country_id", null);
    for (const r of (data ?? []) as { id: string; hq_country: string }[]) {
      const { data: c } = await supabase
        .from("countries")
        .select("country_id")
        .ilike("country_name", r.hq_country.trim())
        .limit(1)
        .maybeSingle();
      if (c) await supabase.from(t).update({ hq_country_id: (c as { country_id: string }).country_id }).eq("id", r.id);
    }
  }
}
