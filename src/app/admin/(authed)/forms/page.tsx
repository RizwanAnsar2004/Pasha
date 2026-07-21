import { createServiceClient } from "@/lib/supabase/server";
import { getAdminOptionTypes } from "@/lib/options/admin.server";
import { FormBuilderClient, type SectionRow, type FieldRow } from "./FormBuilderClient";

// Admin form builder — define the public apply form's sections, fields, input types, validations, and repeatable subsections.
export const dynamic = "force-dynamic";

export default async function FormsPage() {
  const supabase = createServiceClient();
  const [{ data: sections }, { data: fields }, optionLists] = await Promise.all([
    supabase.from("form_sections").select("*").order("step").order("sort_order"),
    supabase.from("form_fields").select("*").order("sort_order"),
    getAdminOptionTypes(),
  ]);
  const optionListNames = optionLists.map((l) => l.name);

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-pasha-ink">Form builder</h1>
        <p className="mt-1 text-sm text-pasha-muted">
          Define the sign-up (registration) form and the post-login application
          form. Changes go live immediately. Fields mapped to a database column
          feed vetting and the public directory.
        </p>
      </div>
      <FormBuilderClient
        initialSections={(sections ?? []) as SectionRow[]}
        initialFields={(fields ?? []) as FieldRow[]}
        optionListNames={optionListNames}
      />
    </div>
  );
}
