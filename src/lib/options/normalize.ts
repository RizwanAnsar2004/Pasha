import type { OptionItem, OptionList } from "./types";

// Converts any option list to {value,label}[], dropping blanks and case-insensitive duplicates.
export function normalizeOptions(list: OptionList | null | undefined): OptionItem[] {
  if (!list) return [];

  const seen = new Set<string>();
  const out: OptionItem[] = [];

  for (const option of list) {
    const value = (typeof option === "string" ? option : option?.value ?? "").trim();
    if (!value) continue;

    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const label = (typeof option === "string" ? option : option?.label ?? "").trim() || value;
    out.push({ value, label });
  }

  return out;
}
