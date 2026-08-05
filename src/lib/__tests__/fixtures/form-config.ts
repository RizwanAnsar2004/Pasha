// A form config shaped like the real seeded application form, for tests that
// used to assert against the deleted hard-coded `submissionSchema`.
//
// Kept deliberately close to supabase/migrations/20260621_full_application_form.sql
// — same field keys, same input types, same validation bags — so a test that
// passes here is testing something the live form actually does.

import { InputType } from "@/lib/forms/form-enums";
import type { FormConfig, FormFieldConfig } from "@/lib/forms/form-config";

let seq = 0;

export function field(
  p: Partial<FormFieldConfig> & { field_key: string; input_type: number }
): FormFieldConfig {
  return {
    id: `f${seq++}`,
    label: p.field_key,
    required: false,
    validation: {},
    visible: true,
    sort_order: 0,
    ...p,
  };
}

export function section(fields: FormFieldConfig[], step = 1): FormConfig {
  return [
    {
      id: `s${step}`,
      key: `s${step}`,
      title: "Section",
      subtitle: null,
      step,
      sort_order: 0,
      is_active: true,
      fields,
    },
  ];
}

/** URL fields on the real form, all optional except `website`. */
export const URL_FIELDS = [
  "website",
  "logo_url",
  "pitch_deck_url",
  "pitch_video",
  "company_linkedin",
  "company_x",
  "company_instagram",
  "company_facebook",
  "company_youtube",
] as const;

export function applicationConfig(): FormConfig {
  return section([
    field({ field_key: "startup_name", input_type: InputType.TEXT, required: true, validation: { minLength: 2 } }),
    field({ field_key: "tagline", input_type: InputType.TEXTAREA, validation: { maxLength: 160 } }),
    ...URL_FIELDS.map((key) =>
      field({ field_key: key, input_type: InputType.URL, required: key === "website" })
    ),
    field({
      field_key: "year_founded",
      input_type: InputType.TEXT,
      required: true,
      // The shape is the admin's regex; "not in the future" is the FORM_RULES half.
      validation: { pattern: "^(19|20)\\d{2}$" },
    }),
    field({
      field_key: "description",
      input_type: InputType.TEXTAREA,
      required: true,
      validation: { minLength: 50, maxLength: 2000 },
    }),
    field({ field_key: "location", input_type: InputType.CITY_COMPOSITE }),
    field({
      field_key: "primary_sector",
      input_type: InputType.SELECT,
      required: true,
      options: [
        { value: "ai", label: "Artificial Intelligence (AI)" },
        { value: "Other", label: "Other" },
      ],
    }),
    field({
      field_key: "stage",
      input_type: InputType.SELECT,
      required: true,
      options: [{ value: "growth", label: "Growth (Series B,C)" }],
    }),
    field({ field_key: "total_employees", input_type: InputType.NUMBER }),
    field({ field_key: "female_employees", input_type: InputType.NUMBER }),
    field({ field_key: "tam_amount", input_type: InputType.NUMBER, validation: { integer: false } }),
    field({ field_key: "sam_amount", input_type: InputType.NUMBER, validation: { integer: false } }),
    field({ field_key: "som_amount", input_type: InputType.NUMBER, validation: { integer: false } }),
    field({ field_key: "is_pasha_member", input_type: InputType.YES_NO }),
    // Founders is a GROUP with no child rows — the registry resolves it to the
    // hard-coded composite, exactly as the live config does.
    field({ field_key: "founders", input_type: InputType.GROUP, required: true }),
  ]);
}

/** The minimum payload that satisfies applicationConfig(). */
export function validPayload(): Record<string, unknown> {
  return {
    startup_name: "BearPlex",
    website: "https://bearplex.com",
    year_founded: "2020",
    description: "x".repeat(60),
    hq_city: "Lahore",
    outside_pakistan: false,
    primary_sector: "ai",
    stage: "growth",
    founders: [
      {
        name: "Hamad Pervaiz",
        role: "CEO",
        email: "hamad@bearplex.com",
        mobile: "03001234567",
        is_primary: true,
      },
    ],
  };
}
