import { createServiceClient } from "@/lib/supabase/server";
import {
  committeeMemberName,
  type CommitteeActivityRow,
  type CommitteeMemberRow,
} from "@/lib/committee";

const ACTIVITY_COLS =
  "id,title,type,description,status,author_email,created_at";

const MEMBER_COLS = "email,added_at,added_by,notes,org";

/** Only return empty for a genuinely missing table, not a missing column. */
function isMissingTable(msg: string, table: string) {
  return new RegExp(`relation "${table}" does not exist|table "${table}" does not exist`, "i").test(msg);
}

function normalizeMember(row: Record<string, unknown>): CommitteeMemberRow {
  const email = String(row.email ?? "");
  return {
    email,
    name: committeeMemberName(email),
    role: String(row.notes ?? "").trim(),
    org: String(row.org ?? "").trim(),
    added_at: String(row.added_at ?? ""),
  };
}

export async function getPublishedCommitteeActivities(
  limit = 50
): Promise<CommitteeActivityRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("committee_activities")
    .select(ACTIVITY_COLS)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTable(error.message, "committee_activities")) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as CommitteeActivityRow[];
}

/** Committee members from admin_users — same records as /admin/committee-management. */
export async function getCommitteeMembers(): Promise<CommitteeMemberRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select(MEMBER_COLS)
    .order("added_at", { ascending: true });

  if (error) {
    if (isMissingTable(error.message, "admin_users")) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((r) => normalizeMember(r as Record<string, unknown>));
}
