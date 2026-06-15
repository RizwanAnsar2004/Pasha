import "server-only";
import { cache } from "react";
import { createServiceClient } from "./supabase/server";
import { OPTION_LISTS, normalizeOptions, type OptionList } from "./options";

export type OptionItem = { value: string; label: string };
export type OptionRegistry = Record<string, OptionItem[]>;

type OptionListRow = {
  name: string;
  label: string | null;
  items: unknown;
};

/**
 * The resolved registry the renderer uses: every code list from
 * `src/lib/options.ts`, with any admin-managed DB list of the same `name`
 * overlaid on top (DB wins). Safe before the migration is applied — falls back
 * to code lists on any DB error.
 */
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
  return registry;
});

export type OptionListMeta = {
  name: string;
  label: string;
  items: OptionItem[];
  source: "code" | "db" | "override"; // override = a DB row shadowing a code list
};

/**
 * All lists for the admin manager + builder dropdown: code lists, DB lists, and
 * DB rows that override a code list (flagged as "override"). Sorted by name.
 */
export const getOptionListsForAdmin = cache(async (): Promise<OptionListMeta[]> => {
  const codeNames = new Set(Object.keys(OPTION_LISTS));
  const byName = new Map<string, OptionListMeta>();

  for (const [name, list] of Object.entries(OPTION_LISTS)) {
    byName.set(name, { name, label: name, items: normalizeOptions(list), source: "code" });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("option_lists")
    .select("name, label, items");
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
