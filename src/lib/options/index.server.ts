import "server-only";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/server";
import { getOptionRows } from "./registry.server";
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
    .select("country_id, country_name")
    .eq("is_active", true);

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
  const index = buildOptionIndex(await getOptionRows());
  return mergeCountries(index);
});
