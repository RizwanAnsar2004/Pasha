import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getDatabankEditableFields } from "@/lib/forms/form-config.server";
import { getFormOptionRegistry } from "@/lib/options/registry.server";
import { EditDatabankClient, type DatabankRow } from "./EditDatabankClient";

export const dynamic = "force-dynamic";

async function load(id: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("databank")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as DatabankRow;
}

export default async function EditDatabankPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [row, editableFields, optionLists] = await Promise.all([
    load(id),
    getDatabankEditableFields(),
    getFormOptionRegistry(),
  ]);
  if (!row) notFound();
  // The hand-written column fields below the config-driven section. They cover
  // imported columns (startupconnect, ignite, outreach tracking) that the
  // application form has no field for — everything the form DOES define is now
  // rendered from the config above, so showing both would duplicate it.
  //
  // NB: source_id is set for apply-form records too (admin/submission publishes
  // with source_id = submission id), so it never distinguished legacy records
  // the way the old comment here claimed.
  const configColumns = new Set(
    editableFields.map((f) => f.column_map).filter((c): c is string => Boolean(c))
  );
  return (
    <EditDatabankClient
      initial={row}
      dynamicFields={editableFields}
      configColumns={[...configColumns]}
      optionLists={optionLists}
    />
  );
}
