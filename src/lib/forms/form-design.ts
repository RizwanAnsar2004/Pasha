// THE form design.
//
// `toDesign(config)` turns the form_fields rows coming from the API into a flat
// array of FormItem — one entry per field, each carrying its own Zod schema,
// the way a hand-written form would carry a schema per field. `getSchema(design)`
// collects those into the object schema.
//
//   API config ──toDesign──▶ FormItem[] ──getSchema──▶ z.object
//                                 │
//                                 └──▶ inputs.tsx: one switch, one control each
//
// Read top to bottom:
//   1. FormItem            — what one field is
//   2. Zod builders        — validation from the API's `validation` bag
//   3. INPUT_TYPES         — per-input-type behaviour (schema, default, chrome)
//   4. toDesign / getSchema
//   5. HARDCODED EXTRAS    — everything the API cannot express, at the bottom
//
// Anything an admin can set in /admin/forms (pattern, minLength, maxLength, min,
// max, required, options) is handled in 2–3 and needs no code change. Only rules
// the admin has no way to express belong in section 5.
//
// This file must stay free of React imports: /api/submit, the draft route and
// the edit-request route all call getSchema() on the server, and pulling the
// controls into that graph would drag CKEditor and react-dropzone with them.

import { z } from "zod";
import { isValidPhone, PHONE_VALIDATION_MESSAGE } from "@/lib/validators/phone";
import { InputType, type ValidationSpec } from "@/lib/forms/form-enums";
import { isOtherChoice, isOtherPicked, normalizeOptions, OPTION_LISTS } from "@/lib/options";
import type { FormConfig, FormFieldConfig } from "@/lib/forms/form-config";

// ===========================================================================
// 1. FormItem — one field of the form
// ===========================================================================

export type Choice = { value: string; label: string };

export type FormItem = {
  id: string;
  /** Key in the form state. Dotted for a group child: "founders.0.email". */
  fieldName: string;
  inputType: number;
  /** The type the renderer switches on. Differs from `inputType` only for the
   *  two key-based overrides (founders, startup_name) — see resolveType. */
  typeKey: TypeKey;
  label?: string;
  hint?: string;
  placeholder?: string;
  required: boolean;
  hidden: boolean;
  /** Validation bag exactly as the API sent it, kept for the control to read. */
  validation: ValidationSpec;
  /** This item's own schema — the design array's answer to `yupSchema`. */
  schema: z.ZodTypeAny;
  /** Empty form-state value, so controlled inputs are controlled from render 1. */
  defaultValue: unknown;

  options?: Choice[];
  optionsSource?: string | null;
  /** Show only while this sibling holds this value. */
  conditional?: { fieldName: string; equals: unknown } | null;

  /** Native <input type> for the text family. */
  htmlType?: string;
  /** The control draws its own label/error chrome (phone, city, founders…). */
  ownsChrome?: boolean;
  /** Not a native input, so <Field> must not point its <label> at it. */
  customControl?: boolean;
  /** Pairs with a `${fieldName}_other` free-text companion. */
  choice?: boolean;
  /** Holds no submittable value (headings). */
  valueless?: boolean;
  /** Writes several form-state keys instead of one (the city composite). */
  expandsTo?: readonly string[];

  /** GROUP only. */
  children?: FormItem[];
  repeatable?: boolean;
  minItems?: number | null;
  maxItems?: number | null;
  itemLabel?: string | null;

  /** Where this field sits in the wizard. */
  step: number;
  sectionId: string;
  sectionTitle: string;
  sectionSubtitle?: string | null;
};

// ===========================================================================
// 2. Zod builders — validation from the API's `validation` bag
// ===========================================================================

// Strict URL: http/https only (rejects javascript:, data:, vbscript:) AND a real
// dotted host with a TLD — so garbage like "https://not-a-valid-url-at-all" (a
// host with no dot) is rejected rather than saved.
export const SAFE_URL_RE =
  /^https?:\/\/(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:[/?#][^\s<>"]*)?$/i;

const SAFE_URL_MESSAGE = "Must be a valid http or https URL";

// Only primitives are stringified. An array or object passes through untouched
// so Zod's own string check rejects it: String(["Bear"]) is "Bear", so coercing
// here would silently accept — and then persist — a mangled value.
const isCoercible = (v: unknown) =>
  typeof v === "string" || typeof v === "number" || typeof v === "boolean";

const emptyToUndef = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : isCoercible(v) ? String(v).trim() : v;

const emptyToEmpty = (v: unknown) =>
  v === "" || v === null || v === undefined ? "" : isCoercible(v) ? String(v).trim() : v;

export const optionalString = z.preprocess(emptyToUndef, z.string().min(1).optional());

export const optionalPhone = z.preprocess(
  emptyToUndef,
  z.string().min(1).refine(isValidPhone, { message: PHONE_VALIDATION_MESSAGE }).optional()
);

export const optionalSafeUrl = z.preprocess(
  emptyToUndef,
  z
    .string()
    .min(1)
    .refine((u) => SAFE_URL_RE.test(u), { message: SAFE_URL_MESSAGE })
    .optional()
);

export const optionalBool = z.preprocess((v) => {
  if (v === true || v === "true" || v === 1 || v === "1") return true;
  if (v === false || v === "false" || v === 0 || v === "0") return false;
  return undefined;
}, z.boolean().optional());

/** Collapse an HTML fragment to its visible text, so length rules measure that. */
export function htmlToPlainText(html: string): string {
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
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type StringOpts = { email?: boolean; safeUrl?: boolean };

function stringBase(spec: ValidationSpec, opts: StringOpts, required: boolean): z.ZodTypeAny {
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
      message: SAFE_URL_MESSAGE,
    });
  }

  // The admin's regex, compiled and applied at VALIDATION time (inside the
  // refine) rather than at build time: a malformed pattern must be ignored, not
  // throw and break /api/submit. Only enforced on a non-empty value — an empty
  // optional field never has to match.
  if (spec.pattern) {
    const src = spec.pattern;
    out = out.refine(
      (v: unknown) => {
        if (typeof v !== "string" || v === "") return true;
        // Unicode flag first, so an admin can write \p{L} — the only practical
        // way to say "must contain a letter" without excluding Urdu, Arabic or
        // Chinese. Falls back to a flagless compile because `u` mode rejects
        // escapes that are legal in older patterns.
        try {
          return new RegExp(src, "u").test(v);
        } catch {
          try {
            return new RegExp(src).test(v);
          } catch {
            return true; // an invalid admin pattern must not block submission
          }
        }
      },
      { message: "Invalid format" }
    );
  }
  return out;
}

function makeString(spec: ValidationSpec, required: boolean, opts: StringOpts = {}): z.ZodTypeAny {
  return required
    ? z.preprocess(emptyToEmpty, stringBase(spec, opts, true))
    : z.preprocess(emptyToUndef, stringBase(spec, opts, false).optional());
}

// Text/textarea values can hold legacy HTML from when the field was rich text —
// strip it (only when tags are present, so plain multi-line text is untouched).
function makePlainText(spec: ValidationSpec, required: boolean): z.ZodTypeAny {
  return z.preprocess(
    (v) => (typeof v === "string" && /<[^>]+>/.test(v) ? htmlToPlainText(v) : v),
    makeString(spec, required)
  );
}

function makeRichText(spec: ValidationSpec, required: boolean): z.ZodTypeAny {
  return z.preprocess(
    (v) => (v === null || v === undefined ? "" : String(v)),
    z.string().superRefine((html, ctx) => {
      const len = htmlToPlainText(html).length;
      if (len === 0) {
        if (required) ctx.addIssue({ code: "custom", message: "Required" });
        return; // optional + empty is fine; no further length checks
      }
      if (spec.minLength && len < spec.minLength) {
        ctx.addIssue({ code: "custom", message: `At least ${spec.minLength} characters` });
      }
      if (spec.maxLength && len > spec.maxLength) {
        ctx.addIssue({ code: "custom", message: `At most ${spec.maxLength} characters` });
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

function makeArray(required: boolean): z.ZodTypeAny {
  const filter = (v: unknown) =>
    Array.isArray(v) ? v.filter((x) => x !== null && x !== undefined && x !== "") : [];
  return required
    ? z.preprocess(filter, z.array(z.string()).min(1, "Pick at least one option"))
    : z.preprocess(filter, z.array(z.string()).default([]));
}

// ===========================================================================
// 3. INPUT_TYPES — per-input-type behaviour
//
// One entry per input type: how it validates, what it defaults to, and how it
// renders. Adding a type = a constant in InputType, an entry here, and a case in
// the switch in @/components/form/inputs.
// ===========================================================================

type TypeSpec = {
  schema: (spec: ValidationSpec, required: boolean, field: FormFieldConfig) => z.ZodTypeAny;
  defaultValue: (field: FormFieldConfig) => unknown;
  htmlType?: string;
  ownsChrome?: boolean;
  customControl?: boolean;
  choice?: boolean;
  valueless?: boolean;
  structural?: boolean;
  expandsTo?: readonly string[];
};

/** The four form-state keys a CITY_COMPOSITE field writes. */
export const CITY_COMPOSITE_KEYS = ["hq_city", "hq_other", "outside_pakistan", "hq_country"] as const;

// Two behaviours the DB has no input type for, keyed as strings: the founders
// composite (a GROUP with no child rows) and the startup name (a TEXT field with
// an async uniqueness lookup).
export const FOUNDERS = "founders" as const;
export const STARTUP_NAME = "startup_name" as const;
export type TypeKey = number | typeof FOUNDERS | typeof STARTUP_NAME;

export const INPUT_TYPES: Record<TypeKey, TypeSpec> = {
  [InputType.TEXT]: { schema: makePlainText, defaultValue: () => "", htmlType: "text" },
  [InputType.TEXTAREA]: { schema: makePlainText, defaultValue: () => "" },
  [InputType.EMAIL]: {
    schema: (s, r) => makeString(s, r, { email: true }),
    defaultValue: () => "",
    htmlType: "email",
  },
  [InputType.URL]: {
    schema: (s, r) => makeString(s, r, { safeUrl: true }),
    defaultValue: () => "",
    htmlType: "url",
  },
  [InputType.PHONE]: {
    // Phone format is fixed by isValidPhone; the validation bag adds nothing.
    schema: (_s, r) =>
      r
        ? z.preprocess(
            emptyToEmpty,
            z.string().min(1, "Required").refine(isValidPhone, { message: PHONE_VALIDATION_MESSAGE })
          )
        : optionalPhone,
    defaultValue: () => "",
    htmlType: "tel",
    ownsChrome: true, // explains a keystroke the sanitiser filtered out
  },
  [InputType.NUMBER]: { schema: makeNumber, defaultValue: () => "", htmlType: "number" },
  [InputType.DATE]: { schema: (s, r) => makeString(s, r), defaultValue: () => "", htmlType: "date" },
  [InputType.RICH_TEXT]: { schema: makeRichText, defaultValue: () => "", customControl: true },
  [InputType.SELECT]: {
    schema: (s, r) => makeString(s, r),
    defaultValue: () => "",
    customControl: true,
    choice: true,
  },
  [InputType.RADIO_CARDS]: {
    schema: (s, r) => makeString(s, r),
    defaultValue: () => "",
    customControl: true,
    choice: true,
  },
  [InputType.MULTISELECT]: {
    schema: (_s, r) => makeArray(r),
    defaultValue: () => [],
    customControl: true,
    choice: true,
  },
  [InputType.YES_NO]: {
    // Consent questions, where "No" is not a valid answer, replace the ordinary
    // required check rather than stacking a second message on it. See §5.
    schema: (_s, r, field) =>
      field.required && isConsentField(field.field_key)
        ? optionalBool.refine((v) => v === true, { message: CONSENT_MESSAGE })
        : r
        ? optionalBool.refine((v) => v !== undefined, { message: "Required" })
        : optionalBool,
    defaultValue: (f) => (f.required ? undefined : false),
    customControl: true,
  },
  [InputType.FILE_UPLOAD]: {
    // The stored value is the uploaded file's URL. Byte-level checks (extension,
    // MIME, magic bytes, per-bucket size ceilings) run server-side in
    // /api/upload — they can't be expressed here and must not be trusted to the
    // client anyway.
    schema: (s, r) => makeString(s, r),
    defaultValue: () => "",
    customControl: true,
  },
  [InputType.HEADING]: {
    schema: () => z.unknown().optional(),
    defaultValue: () => undefined,
    valueless: true,
    ownsChrome: true,
  },
  [InputType.GROUP]: {
    // Groups are assembled by toDesign, which recurses into children.
    schema: () => z.unknown().optional(),
    defaultValue: () => ({}),
    structural: true,
    ownsChrome: true,
  },
  [InputType.CITY_COMPOSITE]: {
    schema: () => z.unknown().optional(),
    defaultValue: () => undefined,
    expandsTo: CITY_COMPOSITE_KEYS,
    ownsChrome: true,
  },
  [FOUNDERS]: { schema: () => foundersArray, defaultValue: () => [], ownsChrome: true },
  [STARTUP_NAME]: {
    // Validates exactly like TEXT; the difference is the control, which asks the
    // server whether the name is taken while the applicant types, and so owns
    // the hint and error slots. /api/submit still does the real check.
    schema: makePlainText,
    defaultValue: () => "",
    htmlType: "text",
    ownsChrome: true,
  },
};

/**
 * The ONLY place a field's key influences how it renders or validates.
 *
 * Both overrides are top-level-only: `nested` is true inside a group, where a
 * child reusing one of these keys must stay an ordinary field of its own type.
 */
export function resolveType(field: FormFieldConfig, nested = false): TypeKey {
  if (!nested) {
    if (field.input_type === InputType.GROUP && field.field_key === "founders") return FOUNDERS;
    if (field.input_type === InputType.TEXT && field.field_key === "startup_name") {
      return STARTUP_NAME;
    }
  }
  return field.input_type;
}

const typeSpec = (field: FormFieldConfig, nested = false): TypeSpec =>
  INPUT_TYPES[resolveType(field, nested)] ?? INPUT_TYPES[InputType.TEXT];

export function htmlInputTypeFor(inputType: number): string {
  return INPUT_TYPES[inputType]?.htmlType ?? "text";
}

// ===========================================================================
// 4. toDesign / getSchema
// ===========================================================================

function resolveChoices(field: FormFieldConfig): Choice[] | undefined {
  if (field.options && field.options.length > 0) return normalizeOptions(field.options);
  const src = field.options_source;
  if (src && OPTION_LISTS[src]) return normalizeOptions(OPTION_LISTS[src]);
  return undefined;
}

function toItem(
  field: FormFieldConfig,
  where: Pick<FormItem, "step" | "sectionId" | "sectionTitle" | "sectionSubtitle">,
  nested = false
): FormItem {
  const spec = typeSpec(field, nested);
  const validation = field.validation ?? {};
  // A field gated by a conditional is never required by its own schema — the
  // requirement only bites when the condition holds, which getSchema decides
  // once it can see the sibling's value.
  const required = field.required && !field.conditional;

  // Children come from the raw input type, not the resolved one: founders is a
  // GROUP whose override swaps only the schema and the control, so a config that
  // does give it child rows still gets them walked.
  const isGroup = field.input_type === InputType.GROUP;
  const children = isGroup ? (field.children ?? []).map((c) => toItem(c, where, true)) : undefined;
  // …but a group with an override (founders) takes that entry's schema, not the
  // one assembled from its children.
  const overridden = resolveType(field, nested) !== field.input_type;
  const useGroupShape = isGroup && !overridden;

  return {
    ...where,
    id: field.id,
    fieldName: field.field_key,
    inputType: field.input_type,
    typeKey: resolveType(field, nested),
    label: field.label ?? undefined,
    hint: field.hint ?? undefined,
    placeholder: field.placeholder ?? undefined,
    required: field.required,
    hidden: field.visible === false,
    validation,
    schema: useGroupShape
      ? groupSchema(field, children!)
      : spec.schema(validation, required, field),
    defaultValue: useGroupShape ? groupDefault(field, children!) : spec.defaultValue(field),
    options: resolveChoices(field),
    optionsSource: field.options_source ?? null,
    conditional: field.conditional
      ? { fieldName: field.conditional.field_key, equals: field.conditional.equals }
      : null,
    htmlType: spec.htmlType,
    ownsChrome: spec.ownsChrome,
    customControl: spec.customControl,
    choice: spec.choice,
    valueless: spec.valueless,
    expandsTo: spec.expandsTo,
    children,
    repeatable: field.repeatable,
    minItems: field.min_items,
    maxItems: field.max_items,
    itemLabel: field.item_label,
  };
}

function groupSchema(field: FormFieldConfig, children: FormItem[]): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const child of children) {
    if (!child.valueless) shape[child.fieldName] = child.schema;
  }
  const item = z.object(shape);

  if (!field.repeatable) return field.required ? item : item.optional();

  let arr = z.array(item);
  if (field.min_items != null) arr = arr.min(field.min_items, `Add at least ${field.min_items}`);
  if (field.max_items != null) arr = arr.max(field.max_items, `At most ${field.max_items} allowed`);
  return field.required ? arr : arr.default([]);
}

function groupDefault(field: FormFieldConfig, children: FormItem[]): unknown {
  const item: Record<string, unknown> = {};
  for (const child of children) {
    if (!child.valueless) item[child.fieldName] = child.defaultValue;
  }
  if (!field.repeatable) return item;
  const min = field.min_items ?? 0;
  return min > 0 ? Array.from({ length: min }, () => ({ ...item })) : [];
}

/**
 * The design array: the API's form config as a flat list of fields, top-level
 * only. Group children hang off their parent's `children`.
 */
export function toDesign(config: FormConfig): FormItem[] {
  const out: FormItem[] = [];
  for (const s of [...config].sort((a, b) => a.step - b.step || a.sort_order - b.sort_order)) {
    if (!s.is_active) continue;
    const where = {
      step: s.step,
      sectionId: s.id,
      sectionTitle: s.title,
      sectionSubtitle: s.subtitle ?? null,
    };
    for (const field of s.fields) out.push(toItem(field, where));
  }
  return out;
}

/** Companion free-text key for a choice field: `stage` → `stage_other`. */
export const otherFieldKey = (fieldName: string) => `${fieldName}_other`;

/** Is "Other" currently selected? Handles both the scalar and array cases. */
export const isOtherSelected = (value: unknown) => isOtherPicked(value);

export function isChoiceInput(inputType: number): boolean {
  return INPUT_TYPES[inputType]?.choice === true;
}

/** Every form-state key an item owns — one, or four for the city composite. */
export function itemStateKeys(item: FormItem): string[] {
  if (item.valueless) return [];
  if (item.expandsTo) return [...item.expandsTo];
  return [item.fieldName];
}

/**
 * Collect each item's own schema into the object schema, then apply the
 * hardcoded extras from §5.
 */
export function getSchema(design: FormItem[]): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};
  let hasCity = false;
  const conditionalRequired: FormItem[] = [];
  const choiceKeys: string[] = [];

  for (const item of design) {
    if (item.valueless) continue;

    if (item.expandsTo) {
      hasCity = true;
      Object.assign(shape, CITY_SCHEMA);
      continue;
    }

    shape[item.fieldName] = item.schema;

    // The companion key is always allowed in the shape (harmless when "Other"
    // is not picked) and required by the refine below.
    if (item.choice) {
      shape[otherFieldKey(item.fieldName)] = optionalString;
      choiceKeys.push(item.fieldName);
    }
    if (item.required && item.conditional) conditionalRequired.push(item);
  }

  const labels = Object.fromEntries(
    design.filter((i) => i.label).map((i) => [i.fieldName, i.label!])
  );

  return z.object(shape).superRefine((data: Record<string, unknown>, ctx) => {
    if (hasCity) cityCountryRefine(data, ctx);

    // A required field gated by a conditional is only enforced once its
    // condition holds — otherwise a hidden field blocks submission forever.
    for (const item of conditionalRequired) {
      const c = item.conditional!;
      if (data[c.fieldName] === c.equals && isEmpty(data[item.fieldName])) {
        ctx.addIssue({ code: "custom", message: "Required", path: [item.fieldName] });
      }
    }

    // Picking "Other" without saying what it is loses the answer entirely.
    for (const key of choiceKeys) {
      if (!isOtherPicked(data[key])) continue;
      const text = data[otherFieldKey(key)];
      if (typeof text !== "string" || !text.trim()) {
        ctx.addIssue({ code: "custom", message: "Please specify", path: [otherFieldKey(key)] });
      }
    }

    for (const issue of runRules(data, labels)) {
      ctx.addIssue({ code: "custom", message: issue.message, path: issue.path.split(".") });
    }
  });
}

export function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null || v === "") return true;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/** Empty values for every field, so the form is controlled from first render. */
export function getDefaults(design: FormItem[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const item of design) {
    if (item.valueless) continue;
    if (item.expandsTo) {
      Object.assign(out, { hq_city: "", hq_other: "", hq_country: "", outside_pakistan: false });
      continue;
    }
    out[item.fieldName] = item.defaultValue;
    if (item.choice) out[otherFieldKey(item.fieldName)] = "";
  }
  return out;
}

/** The form-state keys owned by one wizard step, for per-step validation. */
export function stepKeys(design: FormItem[], step: number): string[] {
  return design.filter((i) => i.step === step).flatMap(itemStateKeys);
}

export const stepsOf = (design: FormItem[]) => [...new Set(design.map((i) => i.step))].sort((a, b) => a - b);

export function stepTitles(design: FormItem[]): { num: number; title: string; subtitle: string }[] {
  return stepsOf(design).map((step) => {
    const first = design.find((i) => i.step === step);
    return { num: step, title: first?.sectionTitle ?? `Step ${step}`, subtitle: first?.sectionSubtitle ?? "" };
  });
}

/**
 * Drop single-field-invalid values from a draft so invalid data is never
 * PERSISTED by autosave, not merely blocked at submit. Only NON-EMPTY values
 * failing their own item's schema are removed; empty values and cross-field
 * rules are left alone — a draft is allowed to be incomplete.
 */
export function stripInvalidDraftValues(
  design: FormItem[],
  data: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...data };
  for (const item of design) {
    // Headings hold nothing; the city composite is validated as a unit by
    // cityCountryRefine, so a per-value strip would be wrong.
    if (item.valueless || item.expandsTo) continue;

    if (item.children) {
      const val = out[item.fieldName];
      const strip = (row: unknown) => {
        if (!row || typeof row !== "object") return row;
        const obj = { ...(row as Record<string, unknown>) };
        for (const child of item.children!) {
          if (child.valueless || child.children) continue;
          const v = obj[child.fieldName];
          if (!isEmpty(v) && !child.schema.safeParse(v).success) delete obj[child.fieldName];
        }
        return obj;
      };
      if (Array.isArray(val)) out[item.fieldName] = val.map(strip);
      else if (val && typeof val === "object") out[item.fieldName] = strip(val);
      continue;
    }

    const v = out[item.fieldName];
    if (isEmpty(v)) continue;
    if (!item.schema.safeParse(v).success) delete out[item.fieldName];
  }
  return out;
}

// ===========================================================================
// 5. HARDCODED EXTRAS
//
// Everything below is a rule the API config CANNOT express: comparisons between
// two fields, checks against a moving value like the current year, and the two
// composites still defined in code.
//
// Before adding anything here, check whether a `pattern`, `minLength`, `min`,
// `max` or `required` in /admin/forms would do the job — if it would, put it
// there instead and this file needs no change.
// ===========================================================================

// --- Fields measured against another field ---------------------------------
//
// Yup would write this on the field itself, as `.max(Yup.ref("total_employees"))`.
// Zod has no ref(), so the comparison is declared here in the same per-field
// shape and applied by getSchema() on the whole object. Adding one is a line.
//
// A field with no entry here has no cross-field rule, and an entry whose fields
// are absent from the form is skipped — so deleting a field in /admin/forms
// simply retires its comparison.

type Comparison = {
  /** Measured against the first of these that has a value — the `ref`. */
  refs: string[];
  /** Default label, when the admin hasn't named the field something else. */
  label: string;
  /** What this field is, in the explanation. */
  noun?: string;
  /** Also report the inverse on the ref, so the error follows the field being edited. */
  mirror?: string;
};

/** This field must NOT be greater than its ref. */
const NOT_GREATER_THAN: Record<string, Comparison> = {
  female_employees: {
    refs: ["total_employees"],
    label: "Female employees",
    mirror: "Total employees cannot be less than female employees",
  },
  // TAM ≥ SAM ≥ SOM by definition: the obtainable market is a portion of the
  // serviceable market, which is a portion of the total addressable market.
  // Applicants have submitted these inverted, which renders on the public
  // profile as an obtainable market larger than the total one — arithmetically
  // impossible, and read by investors as proof the listings aren't checked.
  sam_amount: { refs: ["tam_amount"], label: "SAM", noun: "serviceable market" },
  // Falls back to TAM when SAM is blank: with a gap in the middle the inversion
  // would otherwise go unchecked, and it is just as wrong.
  som_amount: { refs: ["sam_amount", "tam_amount"], label: "SOM", noun: "obtainable market" },
};

const NOUNS: Record<string, string> = {
  tam_amount: "total addressable market",
  sam_amount: "serviceable market",
  som_amount: "obtainable market",
};

const DEFAULT_LABELS: Record<string, string> = {
  total_employees: "Total employees",
  tam_amount: "TAM",
  sam_amount: "SAM",
  som_amount: "SOM",
};

/** Year fields that cannot be in the future. The 4-digit shape is the admin's
 *  `pattern`; only the moving upper bound is here, since no regex expresses it. */
const NOT_FUTURE_YEAR = ["year_founded"];
const EARLIEST_YEAR = 1900;

export type RuleIssue = {
  path: string;
  message: string;
  /**
   * The field this was measured against. The live check needs it: with SAM
   * filled, typing the first digit of a larger TAM briefly looks like an
   * inversion, so the UI holds the error until BOTH have been touched.
   */
  comparedTo?: string;
};

/** Numbers arrive as numbers, or as strings when rendered as text. Anything
 *  unparseable counts as absent, so it falls through to the field's own schema. */
export function amount(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function runRules(
  values: Record<string, unknown>,
  labels: Record<string, string> = {}
): RuleIssue[] {
  const out: RuleIssue[] = [];
  const nameOf = (key: string, fallback: string) => labels[key] ?? DEFAULT_LABELS[key] ?? fallback;

  for (const [key, cmp] of Object.entries(NOT_GREATER_THAN)) {
    const self = amount(values[key]);
    if (self === null) continue;

    // Resolve the ref: the first named field that actually has a value.
    const refKey = cmp.refs.find((r) => amount(values[r]) !== null);
    if (!refKey) continue;
    const ref = amount(values[refKey])!;
    if (self <= ref) continue;

    const selfName = nameOf(key, cmp.label);
    const refName = nameOf(refKey, refKey);
    const why =
      cmp.noun && NOUNS[refKey]
        ? ` The ${cmp.noun} is a portion of the ${NOUNS[refKey]}.`
        : "";
    out.push({
      path: key,
      message: `${selfName} cannot be larger than ${refName}.${why}`,
      comparedTo: refKey,
    });
    if (cmp.mirror) out.push({ path: refKey, message: cmp.mirror, comparedTo: key });
  }

  const thisYear = new Date().getFullYear();
  for (const key of NOT_FUTURE_YEAR) {
    const raw = values[key];
    if (raw === "" || raw === null || raw === undefined) continue;
    const n = Number(typeof raw === "string" ? raw.trim() : String(raw));
    if (!Number.isFinite(n)) continue; // shape is the field's own regex to police
    if (n >= EARLIEST_YEAR && n <= thisYear) continue;
    out.push({
      path: key,
      message: `Enter a valid year between ${EARLIEST_YEAR} and ${thisYear}`,
    });
  }

  return out;
}

// --- Consent fields --------------------------------------------------------

// Yes/no questions where "No" is not a valid answer. Matched by key because the
// DB carries no flag for it; a `mustAccept` checkbox in the form builder would
// replace this, at the cost of a config migration.
export const CONSENT_KEY_RE = /(^|_)(terms|consent)(_|$)|agree/;
export const CONSENT_MESSAGE = "You must accept the agreement to continue.";
export const isConsentField = (fieldKey: string) => CONSENT_KEY_RE.test(fieldKey);

// --- The city / country composite ------------------------------------------

// One config row, four form-state keys. Its option lists ARE admin-managed; its
// labels, required flags and branching are not — see CityField.tsx.
const CITY_SCHEMA: Record<string, z.ZodTypeAny> = {
  hq_city: optionalString,
  hq_other: optionalString,
  hq_country: optionalString,
  outside_pakistan: z.boolean().default(false),
};

export function cityCountryRefine(data: Record<string, unknown>, ctx: z.RefinementCtx) {
  const str = (k: string) => (typeof data[k] === "string" ? (data[k] as string) : "");
  if (data.outside_pakistan) {
    if (!str("hq_country").trim()) {
      ctx.addIssue({ code: "custom", message: "Pick a country", path: ["hq_country"] });
    }
    return;
  }
  if (!str("hq_city").trim()) {
    ctx.addIssue({ code: "custom", message: "Pick a city", path: ["hq_city"] });
  }
  if (isOtherChoice(data.hq_city) && !str("hq_other").trim()) {
    ctx.addIssue({ code: "custom", message: "Enter your city", path: ["hq_other"] });
  }
}

// --- The founders composite ------------------------------------------------

// The DB seeds `founders` as a GROUP with no child rows, so its sub-fields live
// here (validation) and in FoundersRepeater (UI) rather than in the admin
// config. Making it config-driven is future work: delete this block and the
// FOUNDERS entry in §3, and nothing else changes.

// Length-only validation lets purely numeric strings ("223232323223") through: a
// name and a role both pass min(2) trivially, so the founder database fills with
// garbage the public profiles then render verbatim. Requiring at least one
// letter is the cheapest rule that rejects it without excluding real names:
// \p{L} matches any script, so Urdu, Arabic and Chinese all pass, as do
// "R2-D2", "O'Neill" and "Anne-Marie".
const humanText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .min(2, message)
    .max(max, `Must be ${max} characters or fewer`)
    .regex(/\p{L}/u, "Must contain at least one letter");

// A custom-link row is only kept when something was typed into it (see the
// preprocess below), and once kept both halves are required — a label with no
// URL renders as a dead link on the public profile.
const founderCustomLink = z.object({
  label: z.string().trim().min(1, "Label required"),
  url: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? "" : String(v).trim()),
    z.string().min(1, "URL required").refine((u) => SAFE_URL_RE.test(u), {
      message: SAFE_URL_MESSAGE,
    })
  ),
});

export const founderSchema = z.object({
  name: humanText(150, "Founder name required"),
  role: humanText(100, "Role required (e.g. CEO, CTO)"),
  email: z.preprocess(
    (v) => (v === "" || v == null ? undefined : String(v).trim()),
    z.string().email("Valid email required").optional()
  ),
  mobile: optionalPhone,
  linkedin: optionalSafeUrl,
  x: optionalSafeUrl,
  instagram: optionalSafeUrl,
  facebook: optionalSafeUrl,
  custom_links: z.preprocess(
    (v) =>
      Array.isArray(v)
        ? v.filter(
            (e) =>
              e &&
              typeof e === "object" &&
              ((e as Record<string, unknown>).label || (e as Record<string, unknown>).url)
          )
        : [],
    z.array(founderCustomLink).default([])
  ),
  photo_url: optionalSafeUrl,
  gender: optionalString,
  is_primary: z.boolean().default(false),
});

export type Founder = z.infer<typeof founderSchema>;

export const foundersArray = z
  .array(founderSchema)
  .min(1, "At least one founder required")
  .superRefine((arr, ctx) => {
    if (!Array.isArray(arr) || arr.length === 0) return;

    // Exactly one primary; if none marked, the first becomes primary.
    if (arr.filter((f) => f.is_primary).length === 0) arr[0].is_primary = true;

    const primary = arr.find((f) => f.is_primary) ?? arr[0];
    if (!primary) return;
    if (!primary.email) {
      ctx.addIssue({
        code: "custom",
        message: "Primary founder must have an email",
        path: [arr.indexOf(primary), "email"],
      });
    }
    if (!primary.mobile) {
      ctx.addIssue({
        code: "custom",
        message: "Primary founder must have a mobile number",
        path: [arr.indexOf(primary), "mobile"],
      });
    }
  });
