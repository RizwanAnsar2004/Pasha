// Isomorphic form-config layer: the TypeScript shape of the API-defined form,
// plus the small helpers that read it — option resolution, step traversal,
// payload routing and label maps.
//
// Validation used to live here too. It now lives in @/lib/forms/form-design,
// which turns this config into a flat design array of FormItem — one entry per
// field, each carrying its own Zod schema.

import { InputType } from "@/lib/forms/form-enums";
import type { ValidationSpec } from "@/lib/forms/form-enums";
import { normalizeOptions, OPTION_LISTS } from "@/lib/options";
import {
  CITY_COMPOSITE_KEYS,
  getDefaults,
  getSchema,
  isChoiceInput,
  otherFieldKey,
  stepKeys,
  stripInvalidDraftValues as stripDraft,
  toDesign,
} from "@/lib/forms/form-design";

// ---------------------------------------------------------------------------

export interface FormFieldConfig {
  id: string;
  field_key: string;
  label?: string | null;
  hint?: string | null;
  placeholder?: string | null;
  input_type: number;
  required: boolean;
  validation: ValidationSpec;
  options?: { value: string; label: string }[] | string[] | null;
  options_source?: string | null;
  repeatable?: boolean;
  min_items?: number | null;
  max_items?: number | null;
  item_label?: string | null;
  column_map?: string | null;
  visible: boolean;
  sort_order: number;
  conditional?: { field_key: string; equals: unknown } | null;
  children?: FormFieldConfig[]; // populated for GROUP nodes
}

export interface FormSectionConfig {
  id: string;
  key: string;
  title: string;
  subtitle?: string | null;
  step: number;
  sort_order: number;
  is_active: boolean;
  fields: FormFieldConfig[]; // top-level fields (parent_field_id IS NULL)
}

export type FormConfig = FormSectionConfig[];

// ---------------------------------------------------------------------------
// Re-exports — the modules below own these; this file is the stable import path.

export { OTHER_VALUE } from "@/lib/options";
export { isChoiceInput, otherFieldKey, CITY_COMPOSITE_KEYS };
export {
  htmlToPlainText,
  isConsentField,
  isOtherSelected,
  toDesign,
  getSchema,
  getDefaults,
  type FormItem,
} from "@/lib/forms/form-design";

// Convenience wrappers for callers that hold the raw API config and have no
// reason to build a design array themselves — mostly the server routes, which
// validate once and discard. Anything that also RENDERS the form should call
// toDesign() once and pass the array around.

export const buildZodSchema = (config: FormConfig) => getSchema(toDesign(config));

export const stepFieldKeys = (config: FormConfig, step: number) =>
  stepKeys(toDesign(config), step);

export const stripInvalidDraftValues = (config: FormConfig, data: Record<string, unknown>) =>
  stripDraft(toDesign(config), data);

// ---------------------------------------------------------------------------

export function resolveOptions(
  field: FormFieldConfig,
  registry?: Record<string, { value: string; label: string }[]>
): { value: string; label: string }[] {
  // Per-field inline options always win.
  if (field.options && field.options.length > 0) return normalizeOptions(field.options);
  const src = field.options_source;
  if (src) {
    // A resolved registry (code + admin-managed DB lists) takes priority; fall
    // back to the code constants when it hasn't been provided.
    if (registry && registry[src]) return registry[src];
    if (OPTION_LISTS[src]) return normalizeOptions(OPTION_LISTS[src]);
  }
  return [];
}

// ---------------------------------------------------------------------------
// Config traversal

/** Distinct, ordered step numbers present in the config. */
export function stepsOf(config: FormConfig): number[] {
  const steps = new Set<number>();
  for (const s of config) if (s.is_active) steps.add(s.step);
  return Array.from(steps).sort((a, b) => a - b);
}

export function sectionsForStep(config: FormConfig, step: number): FormSectionConfig[] {
  return config
    .filter((s) => s.is_active && s.step === step)
    .sort((a, b) => a.sort_order - b.sort_order);
}

// ---------------------------------------------------------------------------
// Payload routing

/**
 * Split a validated payload into real databank columns (fields with a
 * `column_map`) and the `answers` JSONB bag (everything else).
 */
export function routeValues(
  config: FormConfig,
  data: Record<string, unknown>
): { columns: Record<string, unknown>; answers: Record<string, unknown> } {
  const columns: Record<string, unknown> = {};
  const answers: Record<string, unknown> = {};
  for (const section of config) {
    for (const field of section.fields) {
      if (field.input_type === InputType.HEADING) continue;
      if (field.input_type === InputType.CITY_COMPOSITE) {
        for (const k of CITY_COMPOSITE_KEYS) columns[k] = data[k];
        continue;
      }
      const key = field.field_key;
      const value = data[key];
      if (field.column_map) {
        columns[field.column_map] = value;
      } else {
        answers[key] = value;
      }
      // The "Other" free text has no column of its own — it always lands in the
      // answers bag alongside the choice it qualifies.
      if (isChoiceInput(field.input_type)) {
        const ok = otherFieldKey(key);
        const text = data[ok];
        if (typeof text === "string" && text.trim()) answers[ok] = text.trim();
      }
    }
  }
  return { columns, answers };
}

// ---------------------------------------------------------------------------
// Labels

export type FieldLabelMap = Record<string, string>;

function addFieldLabels(map: FieldLabelMap, field: FormFieldConfig): void {
  if (field.input_type === InputType.HEADING) return;

  const label = field.label?.trim();
  if (!label) {
    if (field.input_type === InputType.GROUP) {
      for (const child of field.children ?? []) addFieldLabels(map, child);
    }
    return;
  }

  if (field.input_type === InputType.CITY_COMPOSITE) {
    for (const k of CITY_COMPOSITE_KEYS) {
      if (!map[k]) map[k] = label;
    }
    return;
  }

  if (field.field_key && !map[field.field_key]) map[field.field_key] = label;
  if (field.column_map && !map[field.column_map]) map[field.column_map] = label;

  if (field.input_type === InputType.GROUP) {
    for (const child of field.children ?? []) addFieldLabels(map, child);
  }
}

/** Build field_key / column_map → label from the application form config. */
export function buildFieldLabelMap(config: FormConfig): FieldLabelMap {
  const map: FieldLabelMap = {};
  for (const section of config) {
    for (const field of section.fields) addFieldLabels(map, field);
  }
  return map;
}

const FOUNDER_SUBFIELD_LABELS: Record<string, string> = {
  name: "Name",
  role: "Role",
  email: "Email",
  mobile: "Mobile",
  linkedin: "LinkedIn",
  x: "X / Twitter",
  instagram: "Instagram",
  facebook: "Facebook",
  custom_links: "Custom links",
  photo_url: "Photo",
  gender: "Gender",
  is_primary: "Primary contact",
};

function humanizeFieldKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Resolve a field path (incl. `founders.0.role`) to a human-readable label. */
export function resolveFieldLabel(map: FieldLabelMap, field: string): string {
  const founderPath = field.match(/^founders\.(\d+)\.(.+)$/);
  if (founderPath) {
    const [, idx, prop] = founderPath;
    const human = map[prop] ?? FOUNDER_SUBFIELD_LABELS[prop] ?? humanizeFieldKey(prop);
    return `${human} (founder #${Number(idx) + 1})`;
  }
  return map[field] ?? humanizeFieldKey(field);
}

// ---------------------------------------------------------------------------
// Flattened field definitions, for editors that render the form as one page

export type DynamicFieldDef = {
  // Wizard step this field belongs to, and that step's heading — so a
  // one-page editor can reproduce the same step → section hierarchy.
  step: number;
  step_title: string;
  section: string;
  section_subtitle: string | null;
  field_key: string;
  label: string;
  input_type: number;
  hint: string | null;
  placeholder: string | null;
  options: { value: string; label: string }[];
  // Named option list this field draws from. `options` above resolves only
  // against the CODE constants, but stored answers are admin-managed option
  // ids (UUIDs), so a consumer must re-resolve against the live registry.
  options_source?: string | null;
  // FILE_UPLOAD config (from the field's validation bag).
  bucket?: "logos" | "founder-photos" | "pitch-decks";
  accept?: Record<string, string[]>;
  maxSizeMB?: number;
  // Real databank column this field maps to, when it has one. Null/undefined
  // means the value lives in the `answers` JSONB bag instead.
  column_map?: string | null;
  // GROUP nodes only: the child fields, and how the group repeats. Needed so a
  // one-page editor can render a repeatable subsection (awards, etc.) rather
  // than assuming every group is the founders repeater.
  children?: DynamicFieldDef[];
  repeatable?: boolean;
  item_label?: string | null;
  min_items?: number | null;
  max_items?: number | null;
};

type FormFieldDefList = DynamicFieldDef[];

// Types that hold no editable value of their own.
const DYNAMIC_SKIP_TYPES = new Set<number>([InputType.HEADING]);

// Composite controls: they don't map to one answers key, but they DO occupy a
// position in the form. The databank editor emits them in place and renders its
// own purpose-built editor there (founders → key_persons, city → the HQ
// columns), so the one-page editor keeps the wizard's sequence.
const COMPOSITE_TYPES = new Set<number>([InputType.GROUP, InputType.CITY_COMPOSITE]);

function resolveFieldOptions(field: FormFieldConfig): { value: string; label: string }[] {
  if (Array.isArray(field.options) && field.options.length > 0) {
    return normalizeOptions(field.options);
  }
  if (field.options_source && OPTION_LISTS[field.options_source]) {
    return normalizeOptions(OPTION_LISTS[field.options_source]);
  }
  return [];
}

/** Flatten the form config to the editable answers-bag fields. */
export function collectDynamicFields(config: FormConfig): FormFieldDefList {
  return collectEditableFields(config, { answersOnly: true });
}

/**
 * Every editable field in the application form, in config order — including the
 * ones backed by a real databank column. The databank editor renders from this
 * so it stays in step with the form builder: a field added there shows up for
 * editing without anyone hand-writing JSX for it.
 */
export function collectAllEditableFields(config: FormConfig): FormFieldDefList {
  return collectEditableFields(config, { answersOnly: false });
}

// A GROUP's child field, flattened to the same shape. Children never nest
// further here — the form builder's own nested subsections are rendered by the
// wizard, not by the databank editor.
function childDef(
  field: FormFieldConfig,
  step: number,
  stepTitle: string,
  sectionTitle: string
): DynamicFieldDef {
  return {
    step,
    step_title: stepTitle,
    section: sectionTitle,
    section_subtitle: null,
    field_key: field.field_key,
    label: field.label?.trim() || field.field_key,
    input_type: field.input_type,
    hint: field.hint ?? null,
    placeholder: field.placeholder ?? null,
    options: resolveFieldOptions(field),
    options_source: field.options_source ?? null,
    bucket: field.validation?.bucket,
    accept: field.validation?.accept,
    maxSizeMB: field.validation?.maxSizeMB,
    column_map: field.column_map ?? null,
  };
}

function collectEditableFields(
  config: FormConfig,
  { answersOnly }: { answersOnly: boolean }
): FormFieldDefList {
  const out: DynamicFieldDef[] = [];
  // Walk steps → sections exactly as the wizard does (stepsOf/sectionsForStep
  // sort by step and sort_order and drop inactive sections). Iterating the raw
  // config array instead put the databank editor in a different order from the
  // form applicants actually fill in, and included inactive sections.
  // A step's title is its first section's title.
  const titles = new Map<number, string>(
    stepsOf(config).map((step) => [step, sectionsForStep(config, step)[0]?.title ?? `Step ${step}`])
  );
  for (const step of stepsOf(config)) {
    for (const section of sectionsForStep(config, step)) {
      for (const field of section.fields) {
        if (DYNAMIC_SKIP_TYPES.has(field.input_type)) continue;
        // Composites have no answers key, so the answers-bag collector skips
        // them; the databank collector keeps them as positional markers.
        if (answersOnly && COMPOSITE_TYPES.has(field.input_type)) continue;
        if (answersOnly && field.column_map) continue;
        const label = field.label?.trim();
        if (!label) continue;
        const stepTitle = titles.get(step) ?? `Step ${step}`;
        out.push({
          step,
          step_title: stepTitle,
          section: section.title,
          section_subtitle: section.subtitle ?? null,
          field_key: field.field_key,
          label,
          input_type: field.input_type,
          hint: field.hint ?? null,
          placeholder: field.placeholder ?? null,
          options: resolveFieldOptions(field),
          options_source: field.options_source ?? null,
          bucket: field.validation?.bucket,
          accept: field.validation?.accept,
          maxSizeMB: field.validation?.maxSizeMB,
          column_map: field.column_map ?? null,
          ...(field.input_type === InputType.GROUP
            ? {
                children: (field.children ?? []).map((c) =>
                  childDef(c, step, stepTitle, section.title)
                ),
                repeatable: field.repeatable ?? false,
                item_label: field.item_label ?? null,
                min_items: field.min_items ?? null,
                max_items: field.max_items ?? null,
              }
            : {}),
        });
      }
    }
  }
  return out;
}
