import "server-only";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/server";
import { COUNTRIES } from "./countries";
import type { OptionItem } from "@/lib/options/types";

type CountryRow = {
  country_name: string;
};

type CountryIdRow = {
  country_id: string;
  country_name: string;
};

// Countries keyed by country_id, so the country select submits the id rather than the name.
export const getCountryIdOptions = cache(async (): Promise<OptionItem[]> => {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("countries")
    .select("country_id, country_name, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) return [];

  return (data as CountryIdRow[])
    .filter((row) => row.country_id && row.country_name)
    .map((row) => ({
      value: row.country_id,
      label: row.country_name,
      legacy: row.country_name,
    }));
});

// Reads active countries from the countries table, falling back to the code constant.
export const getCountries = cache(async (): Promise<OptionItem[]> => {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("countries")
    .select("country_name, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) {
    return COUNTRIES.map((name) => ({ value: name, label: name }));
  }

  return (data as CountryRow[]).map((row) => ({ value: row.country_name, label: row.country_name }));
});
