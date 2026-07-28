// Isomorphic helpers for admin-requested partial edits: resolving a request
// scope (whole form / whole sections / individual fields) into the flat
// field_key allow-list the applicant portal gates on, plus a picker outline
// and a human-readable summary for the notification email.

import { InputType } from "@/lib/forms/form-enums";
import type { FormConfig } from "@/lib/forms/form-config";

// Reduce the form config to only the sections/fields in the allow-list, so the
// portal can render a wizard containing just the unlocked fields (headings kept
// for context are dropped). GROUP/composite fields are kept whole.
export function filterConfigToKeys(config: FormConfig, keys: string[]): FormConfig {
  const allow = new Set(keys);
  const out: FormConfig = [];
  for (const s of config) {
    if (!s.is_active) continue;
    const fields = s.fields.filter(
      (f) => f.input_type !== InputType.HEADING && allow.has(f.field_key)
    );
    if (fields.length > 0) out.push({ ...s, fields });
  }
  return out;
}

// What an admin asked to unlock. field_keys/section_keys are top-level keys.
export type EditRequestScope = {
  wholeForm: boolean;
  sectionKeys: string[];
  fieldKeys: string[];
};

// One field in the admin picker.
export type OutlineField = { field_key: string; label: string };
// One section (a wizard step's section) in the admin picker.
export type OutlineSection = {
  key: string;
  title: string;
  step: number;
  fields: OutlineField[];
};

// Every top-level editable field_key in a section (headings hold no value).
function sectionFieldKeys(config: FormConfig, sectionKey: string): string[] {
  const section = config.find((s) => s.key === sectionKey && s.is_active);
  if (!section) return [];
  return section.fields
    .filter((f) => f.input_type !== InputType.HEADING)
    .map((f) => f.field_key);
}

// Every editable field_key in the form, in wizard order.
export function allFieldKeys(config: FormConfig): string[] {
  const keys: string[] = [];
  for (const s of config) {
    if (!s.is_active) continue;
    for (const f of s.fields) {
      if (f.input_type === InputType.HEADING) continue;
      keys.push(f.field_key);
    }
  }
  return keys;
}

// Resolve a request scope into the flat allow-list the portal enforces. A
// whole-form request opens everything; otherwise it's the union of the picked
// sections' fields and the individually picked fields (invalid keys dropped).
export function resolveFieldKeys(config: FormConfig, scope: EditRequestScope): string[] {
  if (scope.wholeForm) return allFieldKeys(config);
  const valid = new Set(allFieldKeys(config));
  const out = new Set<string>();
  for (const k of scope.fieldKeys) if (valid.has(k)) out.add(k);
  for (const sk of scope.sectionKeys) for (const k of sectionFieldKeys(config, sk)) out.add(k);
  return Array.from(out);
}

// field_key -> label, for the email summary.
function fieldLabelByKey(config: FormConfig): Map<string, string> {
  const map = new Map<string, string>();
  for (const s of config) {
    for (const f of s.fields) {
      if (f.input_type === InputType.HEADING) continue;
      map.set(f.field_key, f.label?.trim() || f.field_key);
    }
  }
  return map;
}

// A plain-text summary of what was requested, for {{requested_items}}.
export function summarizeScope(config: FormConfig, scope: EditRequestScope): string {
  if (scope.wholeForm) return "Your entire application";
  const parts: string[] = [];
  const covered = new Set<string>();
  for (const sk of scope.sectionKeys) {
    const section = config.find((s) => s.key === sk);
    if (!section) continue;
    parts.push(section.title);
    for (const k of sectionFieldKeys(config, sk)) covered.add(k);
  }
  const labels = fieldLabelByKey(config);
  for (const fk of scope.fieldKeys) {
    if (covered.has(fk)) continue; // already implied by a whole-section pick
    parts.push(labels.get(fk) ?? fk);
  }
  return parts.join(", ") || "your application";
}

// Build the admin picker outline: sections (with keys) grouped in wizard order,
// each listing its editable top-level fields. Sections with no editable field
// are dropped so the picker has no empty groups.
export function buildOutline(config: FormConfig): OutlineSection[] {
  return config
    .filter((s) => s.is_active)
    .sort((a, b) => a.step - b.step || a.sort_order - b.sort_order)
    .map((s) => ({
      key: s.key,
      title: s.title,
      step: s.step,
      fields: s.fields
        .filter((f) => f.input_type !== InputType.HEADING)
        .map((f) => ({ field_key: f.field_key, label: f.label?.trim() || f.field_key })),
    }))
    .filter((s) => s.fields.length > 0);
}
