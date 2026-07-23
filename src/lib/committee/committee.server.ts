import { createServiceClient } from "@/lib/supabase/server";
import {
  committeeMemberName,
  type CommitteeActivityRow,
  type CommitteeMemberRow,
  type CommitteeMemberType,
} from "@/lib/committee/committee";

const ACTIVITY_COLS =
  "id,title,type,description,status,author_email,created_at";

const MEMBER_COLS = "email,added_at,added_by,notes,org,member_type,name,photo_url";
const MEMBER_COLS_LEGACY = "email,added_at,added_by,notes,org,member_type,name";

// Only return empty for a genuinely missing table, not a missing column.
function isMissingTable(msg: string, table: string) {
  return new RegExp(`relation "${table}" does not exist|table "${table}" does not exist`, "i").test(msg);
}

function normalizeMember(row: Record<string, unknown>): CommitteeMemberRow {
  const email = String(row.email ?? "");
  const rawType = String(row.member_type ?? "member");
  const type: CommitteeMemberType =
    rawType === "chairman" || rawType === "admin" ? rawType : "member";
  const storedName = String(row.name ?? "").trim();
  return {
    email,
    name: storedName || committeeMemberName(email),
    role: String(row.notes ?? "").trim(),
    org: String(row.org ?? "").trim(),
    type,
    added_at: String(row.added_at ?? ""),
    photo_url: String(row.photo_url ?? "").trim() || null,
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

// Committee members from admin_users — same records as /admin/committee-management.
export async function getCommitteeMembers(): Promise<CommitteeMemberRow[]> {
  const supabase = createServiceClient();
  const query = (cols: string) =>
    supabase
      .from("admin_users")
      .select(cols)
      .order("added_at", { ascending: true })
      .overrideTypes<Record<string, unknown>[]>();

  let { data, error } = await query(MEMBER_COLS);

  // photo_url is added by a migration — until it runs, retry without it rather
  // than failing the whole public roster over one optional column.
  if (error && /photo_url/.test(error.message)) {
    ({ data, error } = await query(MEMBER_COLS_LEGACY));
  }

  if (error) {
    if (isMissingTable(error.message, "admin_users")) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((r) => normalizeMember(r as Record<string, unknown>));
}
