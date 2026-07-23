import type { OptionRow } from "./types";

export type OptionIndex = {
  byId: Record<string, { value: string; label: string }>;
  idByValue: Record<string, string>;
  labelByValue: Record<string, string>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const EMPTY_OPTION_INDEX: OptionIndex = { byId: {}, idByValue: {}, labelByValue: {} };

// True when a stored choice is an options.option_id rather than legacy text.
export function isOptionId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

function key(type: string, value: string): string {
  return `${type}::${value.trim().toLowerCase()}`;
}

// Flattens grouped option rows into serialisable id/value lookups usable on the client.
export function buildOptionIndex(rows: Record<string, OptionRow[]> | null | undefined): OptionIndex {
  const index: OptionIndex = { byId: {}, idByValue: {}, labelByValue: {} };
  if (!rows) return index;
  for (const [type, list] of Object.entries(rows)) {
    for (const row of list) {
      index.byId[row.option_id] = { value: row.option_value, label: row.option_label || row.option_value };
      index.idByValue[key(type, row.option_value)] = row.option_id;
      index.labelByValue[key(type, row.option_value)] = row.option_label || row.option_value;
    }
  }
  return index;
}

// Renders a stored choice: option ids become their label, legacy text passes through.
export function resolveOptionLabel(
  index: OptionIndex,
  type: string,
  stored: string | null | undefined
): string | null {
  const raw = typeof stored === "string" ? stored.trim() : "";
  if (!raw) return null;
  const hit = index.byId[raw];
  if (hit) return hit.label;
  if (isOptionId(raw)) return null;
  return index.labelByValue[key(type, raw)] ?? raw;
}

// Public-facing label for a stored choice: "Other" is a data-entry affordance,
// never something a visitor should read, so swap in the free text the applicant
// typed alongside it (answers.<field>_other). Falls back to the label when the
// companion text is missing.
export function resolveChoiceLabel(
  index: OptionIndex,
  type: string,
  stored: string | null | undefined,
  otherText: unknown
): string | null {
  const label = resolveOptionLabel(index, type, stored);
  if (label !== OTHER_LABEL) return label;
  const custom = typeof otherText === "string" ? otherText.trim() : "";
  return custom || null;
}

const OTHER_LABEL = "Other";

// Display label for a stored choice, without needing to know its option type.
export function optionLabelOf(index: OptionIndex, stored: unknown): string | null {
  const raw = typeof stored === "string" ? stored.trim() : "";
  if (!raw) return null;
  return index.byId[raw]?.label ?? raw;
}

// The underlying value for a stored choice held as an option id or legacy text.
export function resolveOptionValue(
  index: OptionIndex,
  stored: string | null | undefined
): string | null {
  const raw = typeof stored === "string" ? stored.trim() : "";
  if (!raw) return null;
  const hit = index.byId[raw];
  if (hit) return hit.value;
  // An unknown id would violate an enum column — drop it rather than fail the insert.
  if (isOptionId(raw)) return null;
  return raw;
}

// Array form, for multiselect answers written to value-typed columns.
export function resolveOptionValues(
  index: OptionIndex,
  stored: unknown
): string[] {
  if (!Array.isArray(stored)) return [];
  const out: string[] = [];
  for (const entry of stored) {
    const value = resolveOptionValue(index, typeof entry === "string" ? entry : null);
    if (value && !out.includes(value)) out.push(value);
  }
  return out;
}

// The option id for a filter param that may already be an id or a legacy value.
export function optionIdFor(index: OptionIndex, type: string, param: string): string | null {
  const raw = typeof param === "string" ? param.trim() : "";
  if (!raw) return null;
  if (index.byId[raw]) return raw;
  return index.idByValue[key(type, raw)] ?? null;
}

// Option ids whose label or value contains the search term, so free-text search still hits.
export function matchingOptionIds(index: OptionIndex, term: string, limit = 12): string[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return [];
  const out: string[] = [];
  for (const [id, entry] of Object.entries(index.byId)) {
    if (out.length >= limit) break;
    if (entry.label.toLowerCase().includes(needle) || entry.value.toLowerCase().includes(needle)) {
      out.push(id);
    }
  }
  return out;
}

// Expands a filter param (option value or id) into every column value that should match it.
export function optionFilterValues(
  index: OptionIndex,
  type: string,
  param: string | null | undefined
): string[] {
  const raw = typeof param === "string" ? param.trim() : "";
  if (!raw) return [];
  const out = new Set<string>([raw]);
  const hit = index.byId[raw];
  if (hit) {
    out.add(hit.value);
    const backId = index.idByValue[key(type, hit.value)];
    if (backId) out.add(backId);
  }
  const id = index.idByValue[key(type, raw)];
  if (id) out.add(id);
  return Array.from(out);
}
