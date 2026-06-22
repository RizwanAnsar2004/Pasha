import { createServiceClient } from "@/lib/supabase/server";
import { BroadcastClient, type TemplateOption } from "./BroadcastClient";

export const dynamic = "force-dynamic";

async function loadActiveTemplates(): Promise<TemplateOption[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("template_id, name, status")
    .eq("status", "active")
    .order("name", { ascending: true });
  if (error) return [];
  return (data ?? []).map((t) => ({
    template_id: t.template_id as string,
    name: (t.name as string) || (t.template_id as string),
  }));
}

export default async function EmailBroadcastPage() {
  const templates = await loadActiveTemplates();
  return <BroadcastClient templates={templates} />;
}
