// Isomorphic form-config layer: the TypeScript shape of the admin-defined form,

import { z } from "zod";
import {
  optionalString,
  optionalSafeUrl,
  optionalPhone,
  requiredPhone,
  requiredSafeUrl,
  optionalBool,
  foundersArray,
  applyCityCountryRefine,
  SAFE_URL_RE,
  yearFoundedFutureMessage,
} from "@/lib/forms/schema";
import { InputType, type ValidationSpec } from "@/lib/forms/form-enums";
import { isOtherPicked, normalizeOptions, OPTION_LISTS } from "@/lib/options";

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

// The keys a CITY_COMPOSITE field expands into in the form state.
export const CITY_COMPOSITE_KEYS = [
  "hq_city",
  "hq_other",
  "outside_pakistan",
  "hq_country",
] as const;

// ---------------------------------------------------------------------------

export { OTHER_VALUE } from "@/lib/options";

// Companion free-text key for a choice field.
export function otherFieldKey(fieldKey: string): string {
  return `${fieldKey}_other`;
}

// Choice inputs that can offer an "Other" entry.
export function isChoiceInput(inputType: number): boolean {
  return (
    inputType === InputType.SELECT ||
    inputType === InputType.MULTISELECT ||
    inputType === InputType.RADIO_CARDS
  );
}

// Is "Other" currently selected for this field's value? Handles both the scalar
export function isOtherSelected(value: unknown): boolean {
  return isOtherPicked(value);
}

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
    if (registry && registry[src]) return registry[src];
    if (OPTION_LISTS[src]) return normalizeOptions(OPTION_LISTS[src]);
  }
  return [];
}

// ---------------------------------------------------------------------------

const emptyToUndef = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : String(v).trim();

const emptyToEmpty = (v: unknown) =>
  v === "" || v === null || v === undefined ? "" : String(v).trim();

// Build a string validator honoring the validation spec. `required` controls
function buildStringBase(
  spec: ValidationSpec,
  opts: { email?: boolean; safeUrl?: boolean },
  required: boolean
): z.ZodTypeAny {
  let s = z.string();
  const minLen = required ? spec.minLength ?? 1 : spec.minLength;
  if (minLen) {
    s = s.min(minLen, required && !spec.minLength ? "Required" : `At least ${minLen} characters`);
  }
  if (spec.maxLength) s = s.max(spec.maxLength, `At most ${spec.maxLength} characters`);
  if (opts.email) s = s.email("Valid email required");

  let out: z.ZodTypeAny = s;
  if (opts.safeUrl) {
    out = out.refine((u: unknown) => typeof u === "string" && SAFE_URL_RE.test(u), {
      message: "Must be a valid http or https URL",
    });
  }
  if (spec.pattern) {
    const re = new RegExp(spec.pattern);
    out = out.refine((v: unknown) => typeof v === "string" && re.test(v), {
      message: "Invalid format",
    });
  }
  return out;
}

function makeOptionalString(
  spec: ValidationSpec,
  opts: { email?: boolean; safeUrl?: boolean } = {}
): z.ZodTypeAny {
  return z.preprocess(emptyToUndef, buildStringBase(spec, opts, false).optional());
}

function makeRequiredString(
  spec: ValidationSpec,
  opts: { email?: boolean; safeUrl?: boolean } = {}
): z.ZodTypeAny {
  return z.preprocess(emptyToEmpty, buildStringBase(spec, opts, true));
}

// Collapse an HTML fragment (CKEditor stores HTML) down to its visible text so
function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote|td|th)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Rich-text fields hold an HTML string, but min/max length must apply to the
function makeRichText(spec: ValidationSpec, required: boolean): z.ZodTypeAny {
  return z.preprocess(
    (v) => (v === null || v === undefined ? "" : String(v)),
    z.string().superRefine((html, ctx) => {
      const len = htmlToPlainText(html).length;
      if (len === 0) {
        if (required) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required" });
        return; // optional + empty is fine; no further length checks
      }
      if (spec.minLength && len < spec.minLength) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `At least ${spec.minLength} characters` });
      }
      if (spec.maxLength && len > spec.maxLength) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `At most ${spec.maxLength} characters` });
      }
    })
  );
}

function makeNumber(spec: ValidationSpec, required: boolean): z.ZodTypeAny {
  const isInt = spec.integer !== false;
  return z.preprocess(
    (v) => {
      if (v === "" || v === null || v === undefined) return undefined;
      const n = typeof v === "string" ? Number(v) : v;
      if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
      return isInt ? Math.floor(n) : n;
    },
    (() => {
      let num = z.number();
      if (isInt) num = num.int();
      num = num.min(spec.min ?? 0, spec.min != null ? `Min ${spec.min}` : undefined);
      if (spec.max != null) num = num.max(spec.max, `Max ${spec.max}`);
      return required ? num : num.optional();
    })()
  );
}

function makeBool(required: boolean): z.ZodTypeAny {
  if (!required) return optionalBool;
  return optionalBool.refine((v) => v !== undefined, { message: "Required" });
}

const filterStrings = (v: unknown) =>
  Array.isArray(v) ? v.filter((x) => x !== null && x !== undefined && x !== "") : [];

function makeArray(required: boolean): z.ZodTypeAny {
  if (!required) return z.preprocess(filterStrings, z.array(z.string()).default([]));
  return z.preprocess(filterStrings, z.array(z.string()).min(1, "Pick at least one option"));
}

function withYearFoundedMax(field: FormFieldConfig, schema: z.ZodTypeAny): z.ZodTypeAny {
  if (field.field_key !== "year_founded") return schema;
  return schema.refine(
    (v) => v === "" || v === undefined || (typeof v === "string" && Number(v) <= new Date().getFullYear()),
    { message: yearFoundedFutureMessage() }
  );
}

// Build the Zod type for a single scalar field.
function scalarZod(field: FormFieldConfig): z.ZodTypeAny {
  const spec = field.validation ?? {};
  const req = field.required && !field.conditional; // conditional-required enforced in superRefine
  let schema: z.ZodTypeAny;
  switch (field.input_type) {
    case InputType.NUMBER:
      schema = makeNumber(spec, req);
      break;
    case InputType.YES_NO:
      schema = makeBool(req);
      break;
    case InputType.MULTISELECT:
      schema = makeArray(req);
      break;
    case InputType.RICH_TEXT:
      // Value is an HTML string; length rules apply to the visible text.
      schema = makeRichText(spec, req);
      break;
    case InputType.EMAIL:
      schema = req
        ? makeRequiredString(spec, { email: true })
        : makeOptionalString(spec, { email: true });
      break;
    case InputType.URL:
      schema = req ? requiredSafeUrl : optionalSafeUrl;
      break;
    case InputType.PHONE:
      schema = req ? requiredPhone : optionalPhone;
      break;
    default:
      // TEXT, TEXTAREA, SELECT, RADIO_CARDS, PHONE, DATE, FILE_UPLOAD
      schema = req ? makeRequiredString(spec) : makeOptionalString(spec);
  }
  return withYearFoundedMax(field, schema);
}

// Build a z.object shape for a GROUP's children.
function groupShape(children: FormFieldConfig[]): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const child of children) {
    if (child.input_type === InputType.GROUP) {
      shape[child.field_key] = groupZod(child);
    } else {
      shape[child.field_key] = scalarZod(child);
    }
  }
  return shape;
}

function groupZod(field: FormFieldConfig): z.ZodTypeAny {
  const item = z.object(groupShape(field.children ?? []));
  if (field.repeatable) {
    let arr = z.array(item);
    if (field.min_items != null) {
      arr = arr.min(field.min_items, `Add at least ${field.min_items}`);
    }
    if (field.max_items != null) {
      arr = arr.max(field.max_items, `At most ${field.max_items} allowed`);
    }
    return field.required ? arr : arr.default([]);
  }
  return field.required ? item : item.optional();
}

function isEmptyValue(v: unknown): boolean {
  if (v === undefined || v === null || v === "") return true;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

// Build a Zod schema from the form config. Top-level fields become object keys;
export function buildZodSchema(config: FormConfig): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};
  let hasCityComposite = false;
  const conditionalRequired: FormFieldConfig[] = [];
  const choiceFields: FormFieldConfig[] = [];

  for (const section of config) {
    for (const field of section.fields) {
      if (field.input_type === InputType.HEADING) continue; // visual only
      if (field.input_type === InputType.CITY_COMPOSITE) {
        hasCityComposite = true;
        shape.hq_city = optionalString;
        shape.hq_other = optionalString;
        shape.hq_country = optionalString;
        shape.outside_pakistan = z.boolean().default(false);
        continue;
      }
      if (field.input_type === InputType.GROUP && field.field_key === "founders") {
        shape.founders = foundersArray;
        continue;
      }
      if (field.input_type === InputType.GROUP) {
        shape[field.field_key] = groupZod(field);
      } else {
        shape[field.field_key] = scalarZod(field);
      }
      // Companion free-text key for choice fields. Always allowed (harmless when
      if (isChoiceInput(field.input_type)) {
        shape[otherFieldKey(field.field_key)] = optionalString;
        choiceFields.push(field);
      }
      if (field.required && field.conditional) conditionalRequired.push(field);
    }
  }

  const obj = z.object(shape);

  return obj.superRefine((data: Record<string, unknown>, ctx) => {
    if (hasCityComposite) {
      applyCityCountryRefine(data as never, ctx);
    }
    // A required field gated by a conditional is only enforced when its
    for (const field of conditionalRequired) {
      const cond = field.conditional!;
      if (data[cond.field_key] === cond.equals && isEmptyValue(data[field.field_key])) {
        ctx.addIssue({ code: "custom", message: "Required", path: [field.field_key] });
      }
    }
    // Picking "Other" without saying what it is loses the answer — which is the
    for (const field of choiceFields) {
      if (!isOtherSelected(data[field.field_key])) continue;
      const key = otherFieldKey(field.field_key);
      const text = data[key];
      if (typeof text !== "string" || !text.trim()) {
        ctx.addIssue({ code: "custom", message: "Please specify", path: [key] });
      }
    }
  });
}

// ---------------------------------------------------------------------------

// Distinct, ordered step numbers present in the config.
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

// Titles for the wizard header — one entry per step (first section's title).
export function stepTitlesOf(
  config: FormConfig
): { num: number; title: string; subtitle: string }[] {
  return stepsOf(config).map((step) => {
    const first = sectionsForStep(config, step)[0];
    return {
      num: step,
      title: first?.title ?? `Step ${step}`,
      subtitle: first?.subtitle ?? "",
    };
  });
}

// The form-state keys owned by a step — used for per-step RHF validation.
export function stepFieldKeys(config: FormConfig, step: number): string[] {
  const keys: string[] = [];
  for (const section of sectionsForStep(config, step)) {
    for (const field of section.fields) {
      if (field.input_type === InputType.HEADING) continue;
      if (field.input_type === InputType.CITY_COMPOSITE) {
        keys.push(...CITY_COMPOSITE_KEYS);
      } else {
        keys.push(field.field_key);
      }
    }
  }
  return keys;
}

// Sensible empty defaults so selects start on their placeholder, arrays are [],
export function buildDefaultValues(config: FormConfig): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const section of config) {
    for (const field of section.fields) {
      if (field.input_type === InputType.HEADING) continue;
      if (field.input_type === InputType.CITY_COMPOSITE) {
        out.hq_city = "";
        out.hq_other = "";
        out.hq_country = "";
        out.outside_pakistan = false;
        continue;
      }
      out[field.field_key] = defaultForField(field);
      // Keep the companion "Other" text controlled from first render.
      if (isChoiceInput(field.input_type)) out[otherFieldKey(field.field_key)] = "";
    }
  }
  return out;
}

function defaultForField(field: FormFieldConfig): unknown {
  switch (field.input_type) {
    case InputType.YES_NO:
      return field.required ? undefined : false;
    case InputType.MULTISELECT:
      return [];
    case InputType.GROUP: {
      const item = groupDefault(field.children ?? []);
      if (field.repeatable) {
        const min = field.min_items ?? 0;
        return min > 0 ? Array.from({ length: min }, () => ({ ...item })) : [];
      }
      return item;
    }
    default:
      return "";
  }
}

function groupDefault(children: FormFieldConfig[]): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  for (const c of children) item[c.field_key] = defaultForField(c);
  return item;
}

// ---------------------------------------------------------------------------
const DEV_COMPANY: Record<string, unknown> = {
  startup_name: "Lumen Robotics",
  tagline: "Autonomous warehouse robots for mid-market logistics",
  website: "https://lumenrobotics.io",
  year_founded: "2021",
  description:
    "Lumen Robotics builds autonomous mobile robots that automate order " +
    "picking and inventory counts for mid-market warehouses across North America.",
  secondary_sector: "Robotics & Automation",
  // Structured awards group (title / year / description per row).
  awards: [
    {
      title: "Forbes AI 50",
      year: "2024",
      description: "Named to the annual list of the 50 most promising AI companies.",
    },
  ],
  certifications: "ISO 9001, SOC 2 Type II",
  closing_notes: "Created via local debug prefill.",
  company_linkedin: "https://www.linkedin.com/company/lumen-robotics",
  company_x: "https://x.com/lumenrobotics",
  company_instagram: "https://www.instagram.com/lumenrobotics",
  company_facebook: "https://www.facebook.com/lumenrobotics",
  company_youtube: "https://www.youtube.com/@lumenrobotics",
};

// Western founders, schema-valid (primary needs name/role/email/mobile; US
const DEV_FOUNDERS = [
  {
    name: "Daniel Carter",
    role: "Co-founder & CEO",
    email: "daniel@lumenrobotics.io",
    mobile: "+1 (512) 555-0142",
    linkedin: "https://www.linkedin.com/in/daniel-carter",
    is_primary: true,
  },
  {
    name: "Emily Nguyen",
    role: "Co-founder & CTO",
    email: "emily@lumenrobotics.io",
    mobile: "+1 (512) 555-0188",
    linkedin: "https://www.linkedin.com/in/emily-nguyen",
    is_primary: false,
  },
];

export function buildDevPrefill(
  config: FormConfig,
  registry?: Record<string, { value: string; label: string }[]>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const section of config) {
    for (const field of section.fields) {
      if (field.input_type === InputType.HEADING) continue;
      if (field.input_type === InputType.CITY_COMPOSITE) {
        // Western HQ — outside Pakistan, so only hq_country is required.
        out.outside_pakistan = true;
        out.hq_city = "";
        out.hq_other = "";
        out.hq_country = "United States";
        continue;
      }
      if (field.input_type === InputType.GROUP && field.field_key === "founders") {
        out.founders = DEV_FOUNDERS.map((f) => ({ ...f }));
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(DEV_COMPANY, field.field_key)) {
        out[field.field_key] = DEV_COMPANY[field.field_key];
        continue;
      }
      out[field.field_key] = devValueForField(field, registry);
    }
  }
  return out;
}

function devValueForField(
  field: FormFieldConfig,
  registry?: Record<string, { value: string; label: string }[]>
): unknown {
  switch (field.input_type) {
    case InputType.EMAIL:
      return "founder@example.com";
    case InputType.URL:
      return "https://example.com";
    case InputType.PHONE:
      return "+923001234567";
    case InputType.NUMBER:
      return String(field.validation?.min ?? 10);
    case InputType.YES_NO:
      return true;
    case InputType.DATE:
      return "2024-01-15";
    case InputType.TEXTAREA:
    case InputType.RICH_TEXT: {
      const text =
        "This is sample content generated for local testing of the registration flow.";
      return field.input_type === InputType.RICH_TEXT ? `<p>${text}</p>` : text;
    }
    case InputType.SELECT:
    case InputType.RADIO_CARDS: {
      const opts = resolveOptions(field, registry);
      return opts[0]?.value ?? "";
    }
    case InputType.MULTISELECT: {
      const opts = resolveOptions(field, registry);
      return opts[0] ? [opts[0].value] : [];
    }
    case InputType.GROUP: {
      const item = devGroupValue(field.children ?? [], registry);
      if (field.repeatable) {
        const count = Math.max(field.min_items ?? 0, 1);
        return Array.from({ length: count }, () => ({ ...item }));
      }
      return item;
    }
    case InputType.FILE_UPLOAD:
      // Files can't be synthesised here — leave empty; testers attach manually.
      return "";
    default: {
      // Plain text: honour minLength so the value clears validation.
      const min = field.validation?.minLength ?? 0;
      const base =
        field.label && field.label.toLowerCase().includes("name")
          ? "Test Startup"
          : "Sample text";
      return base.length >= min ? base : base.padEnd(min, " x").trim();
    }
  }
}

function devGroupValue(
  children: FormFieldConfig[],
  registry?: Record<string, { value: string; label: string }[]>
): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  for (const c of children) {
    if (c.input_type === InputType.HEADING) continue;
    item[c.field_key] = devValueForField(c, registry);
  }
  return item;
}

// Walk the config and split a validated payload into:
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

// Build field_key / column_map → label from the application form config.
export function buildFieldLabelMap(config: FormConfig): FieldLabelMap {
  const map: FieldLabelMap = {};
  for (const section of config) {
    for (const field of section.fields) addFieldLabels(map, field);
  }
  return map;
}

// ---------------------------------------------------------------------------

export type DynamicFieldDef = {
  section: string;
  field_key: string;
  label: string;
  input_type: number;
  hint: string | null;
  placeholder: string | null;
  options: { value: string; label: string }[];
  // FILE_UPLOAD config (from the field's validation bag).
  bucket?: "logos" | "founder-photos" | "pitch-decks";
  accept?: Record<string, string[]>;
  maxSizeMB?: number;
};

// Types that don't hold a single editable answers value here.
const DYNAMIC_SKIP_TYPES = new Set<number>([
  InputType.HEADING,
  InputType.GROUP,
  InputType.CITY_COMPOSITE,
]);

function resolveFieldOptions(field: FormFieldConfig): { value: string; label: string }[] {
  if (Array.isArray(field.options) && field.options.length > 0) {
    return normalizeOptions(field.options);
  }
  if (field.options_source && OPTION_LISTS[field.options_source]) {
    return normalizeOptions(OPTION_LISTS[field.options_source]);
  }
  return [];
}

// Flatten the form config to the editable answers-bag fields: those with no
export function collectDynamicFields(config: FormConfig): DynamicFieldDef[] {
  const out: DynamicFieldDef[] = [];
  for (const section of config) {
    for (const field of section.fields) {
      if (DYNAMIC_SKIP_TYPES.has(field.input_type)) continue;
      if (field.column_map) continue;
      const label = field.label?.trim();
      if (!label) continue;
      out.push({
        section: section.title,
        field_key: field.field_key,
        label,
        input_type: field.input_type,
        hint: field.hint ?? null,
        placeholder: field.placeholder ?? null,
        options: resolveFieldOptions(field),
        bucket: field.validation?.bucket,
        accept: field.validation?.accept,
        maxSizeMB: field.validation?.maxSizeMB,
      });
    }
  }
  return out;
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

// Resolve a field path (incl. `founders.0.role`) to a human-readable label.
export function resolveFieldLabel(map: FieldLabelMap, field: string): string {
  const founderPath = field.match(/^founders\.(\d+)\.(.+)$/);
  if (founderPath) {
    const [, idx, prop] = founderPath;
    const human =
      map[prop] ?? FOUNDER_SUBFIELD_LABELS[prop] ?? humanizeFieldKey(prop);
    return `${human} (founder #${Number(idx) + 1})`;
  }
  return map[field] ?? humanizeFieldKey(field);
}
