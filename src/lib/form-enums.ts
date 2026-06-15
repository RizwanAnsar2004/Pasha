// Int-based enums for the dynamic form builder.
//
// Each form field stores its control as an integer `input_type`. The renderer
// (DynamicField) and the runtime Zod builder (buildZodSchema) both switch on
// these values. Keeping them as ints (not strings) is the "int based enums"
// the form-config DB rows persist.

export const InputType = {
  TEXT: 0,
  EMAIL: 1,
  URL: 2,
  PHONE: 3,
  NUMBER: 4,
  TEXTAREA: 5,
  SELECT: 6, // single-select dropdown
  MULTISELECT: 7, // checkbox group → string[]
  YES_NO: 8, // boolean
  RADIO_CARDS: 9, // single-select card group
  DATE: 10,
  GROUP: 20, // subsection; repeatable=true → array of item objects
  HEADING: 30, // label-only divider; no value, no column (visual sub-group)
  FILE_UPLOAD: 90, // built-in FileUpload control
  CITY_COMPOSITE: 91, // built-in CityField (hq_city/hq_other/outside_pakistan/hq_country)
} as const;

export type InputTypeValue = (typeof InputType)[keyof typeof InputType];

// Human labels for the admin input-type dropdown.
export const INPUT_TYPE_LABELS: Record<number, string> = {
  [InputType.TEXT]: "Text",
  [InputType.EMAIL]: "Email",
  [InputType.URL]: "URL",
  [InputType.PHONE]: "Phone",
  [InputType.NUMBER]: "Number",
  [InputType.TEXTAREA]: "Long text",
  [InputType.SELECT]: "Dropdown (single)",
  [InputType.MULTISELECT]: "Checkboxes (multiple)",
  [InputType.YES_NO]: "Yes / No",
  [InputType.RADIO_CARDS]: "Radio cards (single)",
  [InputType.DATE]: "Date",
  [InputType.GROUP]: "Subsection (group)",
  [InputType.HEADING]: "Heading / divider",
  [InputType.FILE_UPLOAD]: "File upload",
  [InputType.CITY_COMPOSITE]: "City / country (built-in)",
};

// HEADING and GROUP nodes don't themselves hold a submittable scalar value.
// HEADING is purely visual; GROUP holds an object/array assembled from children.
export function isHeading(t: number): boolean {
  return t === InputType.HEADING;
}

// Which native <input type> a scalar field maps to.
export function htmlInputType(t: number): string {
  switch (t) {
    case InputType.EMAIL:
      return "email";
    case InputType.URL:
      return "url";
    case InputType.PHONE:
      return "tel";
    case InputType.NUMBER:
      return "number";
    case InputType.DATE:
      return "date";
    default:
      return "text";
  }
}

// The set of input types whose value is a plain string in the form state.
export function isScalarString(t: number): boolean {
  return (
    t === InputType.TEXT ||
    t === InputType.EMAIL ||
    t === InputType.URL ||
    t === InputType.PHONE ||
    t === InputType.TEXTAREA ||
    t === InputType.SELECT ||
    t === InputType.RADIO_CARDS ||
    t === InputType.DATE ||
    t === InputType.FILE_UPLOAD
  );
}

// Validation spec persisted in form_fields.validation (JSONB).
export type ValidationSpec = {
  min?: number; // numbers: minimum value
  max?: number; // numbers: maximum value
  minLength?: number; // strings: min length
  maxLength?: number; // strings: max length
  pattern?: string; // strings: RegExp source the value must match
  integer?: boolean; // numbers: must be an integer
  safeUrl?: boolean; // strings: must be a http/https URL
  // FILE_UPLOAD-only options (validation JSONB is a freeform bag)
  bucket?: "logos" | "founder-photos" | "pitch-decks";
  accept?: Record<string, string[]>;
  maxSizeMB?: number;
};
