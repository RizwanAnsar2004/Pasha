// Int-based enums for the dynamic form builder.

export const InputType = {
  TEXT: 0,
  EMAIL: 1,
  URL: 2,
  PHONE: 3,
  NUMBER: 4,
  TEXTAREA: 5,
  RICH_TEXT: 11, // WYSIWYG (CKEditor) → HTML string
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
  [InputType.RICH_TEXT]: "Rich text (WYSIWYG)",
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

// How a type renders and validates is declared once, in
// @/lib/forms/field-types/registry — including its native <input type>, via
// htmlInputTypeFor(). This file holds only the DB's integer vocabulary.

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
