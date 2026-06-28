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
  return <EditDatabankClient initial={row} dynamicFields={dynamicFields} />;
}
