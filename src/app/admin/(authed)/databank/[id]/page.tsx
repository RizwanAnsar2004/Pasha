import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getDatabankDynamicFields } from "@/lib/form-config.server";
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
  const [row, dynamicFields] = await Promise.all([
    load(id),
    getDatabankDynamicFields(),
  ]);
  if (!row) notFound();
  // Legacy/imported records (startupconnect, ignite, etc.) carry a source_id
  // linking back to their import source; new apply-form records don't set one.
  // Legacy records expose their static column editors so imported data can be
  // updated; new records are edited through the dynamic fields alone.
  const isLegacy = !!(row as { source_id?: string | null }).source_id;
  return (
    <EditDatabankClient
      initial={row}
      dynamicFields={dynamicFields}
      showStaticFields={isLegacy}
    />
  );
}
