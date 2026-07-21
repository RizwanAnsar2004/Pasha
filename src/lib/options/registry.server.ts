import "server-only";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/server";
import { getCountries, getCountryIdOptions } from "@/lib/constants/countries.server";
import { OPTION_LISTS } from "./constants";
import { normalizeOptions } from "./normalize";
import { OTHER_VALUE, registerOtherOptionsFromRegistry } from "./choice";
import type {
  OptionItem,
  OptionList,
  OptionListMeta,
  OptionRegistry,
  OptionRow,
} from "./types";

type OptionListRow = {
  name: string;
  label: string | null;
  items: unknown;
};

// Reads active options from the normalised table, grouped by type. Null when the table is absent.
export const getOptionRows = cache(async (): Promise<Record<string, OptionRow[]> | null> => {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("options")
    .select("option_id, option_type, option_value, option_label, sort_order, is_active")
    .eq("is_active", true)
    .order("option_type", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error || !data) return null;

  const byType: Record<string, OptionRow[]> = {};
  for (const row of data as OptionRow[]) {
    (byType[row.option_type] ??= []).push(row);
  }
  return Object.keys(byType).length > 0 ? byType : null;
});

// Resolves every option list: options table, then legacy option_lists, then code constants.
export const getOptionRegistry = cache(async (): Promise<OptionRegistry> => {
  const registry: OptionRegistry = {};
  for (const [name, list] of Object.entries(OPTION_LISTS)) {
    registry[name] = normalizeOptions(list);
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.from("option_lists").select("name, items");
  if (!error && data) {
    for (const row of data as OptionListRow[]) {
      registry[row.name] = normalizeOptions(row.items as OptionList);
    }
  }

  const rows = await getOptionRows();
  if (rows) {
    for (const [type, items] of Object.entries(rows)) {
      registry[type] = items.map((r) => ({ value: r.option_value, label: r.option_label }));
    }
  }

  registry.COUNTRIES = await getCountries();

  return registry;
});

// Option types whose stored column holds an option id rather than legacy text.
// Every dropdown submits an option id; null means "all types", no allow-list.
export const ID_VALUED_OPTION_TYPES: readonly string[] | null = null;

// The registry every write path uses: in-scope lists submit an option id as their value.
export const getFormOptionRegistry = cache(async (): Promise<OptionRegistry> => {
  const registry: OptionRegistry = { ...(await getOptionRegistry()) };
  const idTypes = ID_VALUED_OPTION_TYPES ? new Set<string>(ID_VALUED_OPTION_TYPES) : null;

  const rows = await getOptionRows();
  if (rows) {
    for (const [type, items] of Object.entries(rows)) {
      if (idTypes && !idTypes.has(type)) continue;
      registry[type] = items
        .filter((r) => r.option_id)
        .map((r) => ({
          value: r.option_id,
          label: r.option_label || r.option_value,
          legacy: r.option_value,
          ...(r.option_value === OTHER_VALUE ? { isOther: true } : {}),
        }));
    }
  }

  const countries = await getCountryIdOptions();
  if (countries.length > 0) registry.COUNTRIES = countries;

  registerOtherOptionsFromRegistry(registry);
  return registry;
});

// Returns a single named list from the registry.
export async function getOptionItems(name: string): Promise<OptionItem[]> {
  const registry = await getOptionRegistry();
  return registry[name] ?? [];
}

// Lists every option list for the admin manager, flagging code / db / override origin.
export const getOptionListsForAdmin = cache(async (): Promise<OptionListMeta[]> => {
  const codeNames = new Set(Object.keys(OPTION_LISTS));
  const byName = new Map<string, OptionListMeta>();

  for (const [name, list] of Object.entries(OPTION_LISTS)) {
    byName.set(name, { name, label: name, items: normalizeOptions(list), source: "code" });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.from("option_lists").select("name, label, items");
  if (!error && data) {
    for (const row of data as OptionListRow[]) {
      byName.set(row.name, {
        name: row.name,
        label: row.label || row.name,
        items: normalizeOptions(row.items as OptionList),
        source: codeNames.has(row.name) ? "override" : "db",
      });
    }
  }

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
});
