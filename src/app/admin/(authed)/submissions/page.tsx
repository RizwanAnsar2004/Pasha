import { createServiceClient } from "@/lib/supabase/server";
import { SubmissionsClient } from "./SubmissionsClient";

export const dynamic = "force-dynamic";

async function load() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("submissions")
    .select(
      "id,startup_name,founder_name,founder_email,founder_mobile,primary_sector,hq_city,stage,status,vetting_tier,vetting_score,created_at"
    )
    .order("created_at", { ascending: false })
    .limit(500);
  return data ?? [];
}

export default async function SubmissionsPage() {
  const rows = await load();
  return <SubmissionsClient initial={rows} />;
}
