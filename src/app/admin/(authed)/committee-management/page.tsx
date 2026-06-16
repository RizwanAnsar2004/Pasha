import { createServiceClient } from "@/lib/supabase/server";
import { CommitteeManagementClient } from "./CommitteeManagementClient";

export const dynamic = "force-dynamic";

type MemberRow = {
  email: string;
  added_at: string;
  added_by: string | null;
  roles: string | null;
};

async function loadMembers(): Promise<MemberRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("email, added_at, added_by, notes")
    .order("added_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((m: any) => ({
    email: m.email,
    added_at: m.added_at,
    added_by: m.added_by,
    roles: m.notes,
  })) as MemberRow[];
}

export default async function CommitteeManagementPage() {
  const members = await loadMembers();
  return <CommitteeManagementClient initial={members} />;
}
