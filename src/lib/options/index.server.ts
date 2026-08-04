import "server-only";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/server";
import { getAllOptionRows } from "./registry.server";
import { buildOptionIndex, type OptionIndex } from "./resolve";

type CountryIdRow = {
  country_id: string;
  country_name: string;
};

// Adds countries to the index so hq_country resolves like any other choice column.
async function mergeCountries(index: OptionIndex): Promise<OptionIndex> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("countries")
    .select("country_id, country_name");

  if (error || !data) return index;

  for (const row of data as CountryIdRow[]) {
    if (!row?.country_id || !row?.country_name) continue;
    index.byId[row.country_id] = { value: row.country_name, label: row.country_name };
    const key = `COUNTRIES::${row.country_name.trim().toLowerCase()}`;
    index.idByValue[key] = row.country_id;
    index.labelByValue[key] = row.country_name;
  }
  return index;
}

// The one id→label lookup every render path uses for stored choice columns.
export const getOptionIndex = cache(async (): Promise<OptionIndex> => {
  const index = buildOptionIndex(await getAllOptionRows());
  return mergeCountries(index);
});

// A narrowed index containing only the requested option types.
//
// Anything handed to a client component is serialised into the page's inline
// hydration payload and parsed on the main thread before the page can respond.
// The full index is every option list in the system plus ~200 countries — the
// homepage was shipping around 500 option entries so that one card could label
// five startups, and that payload was the dominant cost in its blocking time.
//
// Server components should keep using getOptionIndex(); this is for the values
// that actually cross into the browser.
//
// Deliberately not wrapped in React's `cache`: its key is argument identity, so
// a fresh array on each call would miss every time and quietly add work rather
// than remove it. getAllOptionRows() is the expensive part and is cached itself.
export async function getOptionIndexFor(
  types: readonly string[]
): Promise<OptionIndex> {
  const all = await getAllOptionRows();
  if (!all) return buildOptionIndex(null);
  const picked: Record<string, (typeof all)[string]> = {};
  for (const type of types) {
    if (all[type]) picked[type] = all[type];
  }
  return buildOptionIndex(picked);
}
