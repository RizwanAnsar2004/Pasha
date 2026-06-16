import { createServiceClient } from "@/lib/supabase/server";
import {
  CommitteeActivityClient,
  type ActivityRow,
} from "./CommitteeActivityClient";

export const dynamic = "force-dynamic";

async function loadActivities(): Promise<ActivityRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("committee_activities")
    .select("id,title,type,description,status,author_email,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    if (/committee_activities|does not exist/i.test(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []) as ActivityRow[];
}

export default async function CommitteeActivityPage() {
  const activities = await loadActivities();
  return <CommitteeActivityClient initial={activities} />;
}
