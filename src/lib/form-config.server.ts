import "server-only";
import { cache } from "react";
import { createServiceClient } from "./supabase/server";
import type { FormConfig, FormFieldConfig, FormSectionConfig } from "./form-config";

type FieldRow = {
  id: string;
  section_id: string;
  parent_field_id: string | null;
  field_key: string;
  label: string | null;
  hint: string | null;
  placeholder: string | null;
  input_type: number;
  required: boolean;
  validation: FormFieldConfig["validation"] | null;
  options: FormFieldConfig["options"] | null;
  options_source: string | null;
  repeatable: boolean;
  min_items: number | null;
  max_items: number | null;
  item_label: string | null;
  column_map: string | null;
  visible: boolean;
  sort_order: number;
  conditional: FormFieldConfig["conditional"] | null;
};

type SectionRow = {
  id: string;
  key: string;
  title: string;
  subtitle: string | null;
  step: number;
  sort_order: number;
  is_active: boolean;
};

function toFieldConfig(row: FieldRow, childrenByParent: Map<string, FieldRow[]>): FormFieldConfig {
  const kids = (childrenByParent.get(row.id) ?? []).sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: row.id,
    field_key: row.field_key,
    label: row.label,
    hint: row.hint,
    placeholder: row.placeholder,
    input_type: row.input_type,
    required: row.required,
    validation: row.validation ?? {},
    options: row.options ?? null,
    options_source: row.options_source,
    repeatable: row.repeatable,
    min_items: row.min_items,
    max_items: row.max_items,
    item_label: row.item_label,
    column_map: row.column_map,
    visible: row.visible,
    sort_order: row.sort_order,
    conditional: row.conditional,
    children: kids.length > 0 ? kids.map((k) => toFieldConfig(k, childrenByParent)) : undefined,
  };
}

/**
 * Load a form's config (sections + recursively nested fields) from the DB.
 * `formKey` selects which form to load — 'application' (the post-login apply
 * form, default) or 'registration' (the sign-up form). Returns null when the
 * form_builder tables don't exist yet (pre-migration) or when nothing has been
 * seeded for that form — callers fall back to the static form/schema.
 * Cached per-request (per formKey) via React cache().
 */
export const getFormConfig = cache(
  async (formKey: string = "application"): Promise<FormConfig | null> => {
  const supabase = createServiceClient();

  // `form_key` only exists after 20260618; if the column is missing the query
  // errors and we fall back. Application is the historical (column-less) form,
  // so only filter when asking for a non-default form to stay back-compatible.
  let sectionsQuery = supabase
    .from("form_sections")
    .select("*")
    .eq("is_active", true);
  if (formKey !== "application") {
    sectionsQuery = sectionsQuery.eq("form_key", formKey);
  }

  const [{ data: sections, error: secErr }, { data: fields, error: fieldErr }] = await Promise.all([
    sectionsQuery
      .order("step", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase.from("form_fields").select("*").order("sort_order", { ascending: true }),
  ]);

  // Missing tables / any load error → signal "use the static fallback".
  if (secErr || fieldErr) return null;
  if (!sections || sections.length === 0) return null;

  // For the default 'application' form, exclude any registration sections (the
  // column may or may not exist — guard defensively).
  const scoped =
    formKey === "application"
      ? (sections as SectionRow[]).filter(
          (s) => (s as { form_key?: string }).form_key == null || (s as { form_key?: string }).form_key === "application"
        )
      : (sections as SectionRow[]);
  if (scoped.length === 0) return null;

  const fieldRows = (fields ?? []) as FieldRow[];
  const childrenByParent = new Map<string, FieldRow[]>();
  const topBySection = new Map<string, FieldRow[]>();
  for (const f of fieldRows) {
    if (f.parent_field_id) {
      const arr = childrenByParent.get(f.parent_field_id) ?? [];
      arr.push(f);
      childrenByParent.set(f.parent_field_id, arr);
    } else {
      const arr = topBySection.get(f.section_id) ?? [];
      arr.push(f);
      topBySection.set(f.section_id, arr);
    }
  }

  return scoped.map<FormSectionConfig>((s) => ({
    id: s.id,
    key: s.key,
    title: s.title,
    subtitle: s.subtitle,
    step: s.step,
    sort_order: s.sort_order,
    is_active: s.is_active,
    fields: (topBySection.get(s.id) ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((f) => toFieldConfig(f, childrenByParent)),
  }));
});

/** The sign-up form (spec §3). Cached per-request via getFormConfig. */
export const getRegistrationConfig = (): Promise<FormConfig | null> =>
  getFormConfig("registration");
