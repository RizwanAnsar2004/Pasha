import { createServiceClient } from "@/lib/supabase/server";
import { FormBuilderClient, type SectionRow, type FieldRow } from "./FormBuilderClient";

// Admin form builder — define the public apply form's sections, fields, input
// types, validations, and repeatable subsections. Auth is enforced by the
// parent (authed) layout.
export const dynamic = "force-dynamic";

export default async function FormsPage() {
  const supabase = createServiceClient();
  const [{ data: sections }, { data: fields }] = await Promise.all([
    supabase.from("form_sections").select("*").order("step").order("sort_order"),
    supabase.from("form_fields").select("*").order("sort_order"),
  ]);

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-pasha-ink">Form builder</h1>
        <p className="mt-1 text-sm text-pasha-muted">
          Define the public apply form. Changes go live immediately. Fields mapped
          to a database column feed vetting and the public directory.
        </p>
      </div>
      <FormBuilderClient
        initialSections={(sections ?? []) as SectionRow[]}
        initialFields={(fields ?? []) as FieldRow[]}
      />
    </div>
  );
}
