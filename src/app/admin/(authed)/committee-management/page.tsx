import { createClient, createServiceClient } from "@/lib/supabase/server";
import { CommitteeManagementClient } from "./CommitteeManagementClient";
import { parsePagination } from "@/lib/utils/pagination";
import { readAdminSession } from "@/lib/auth/admin/admin-session";
import type { CommitteeMemberType } from "@/lib/committee/committee";

export const dynamic = "force-dynamic";

export type MemberRow = {
  email: string;
  name: string;
  added_at: string;
  added_by: string | null;
  roles: string | null;
  org: string;
  type: CommitteeMemberType;
};

function normalizeType(v: unknown): CommitteeMemberType {
  return v === "chairman" || v === "admin" ? v : "member";
}

async function loadMembers(
  params: { from: number; to: number },
  q: string,
  typeFilter: string
) {
  const supabase = createServiceClient();
  let query = supabase
    .from("admin_users")
    .select("email, name, added_at, added_by, notes, org, member_type", { count: "exact" });
  if (q.length >= 1) {
    const pattern = `%${q}%`;
    query = query.or(
      `email.ilike.${pattern},name.ilike.${pattern},notes.ilike.${pattern},org.ilike.${pattern}`
    );
  }
  if (typeFilter === "chairman" || typeFilter === "member" || typeFilter === "admin") {
    query = query.eq("member_type", typeFilter);
  }
  const { data, count, error } = await query
    .order("updated_at", { ascending: false })
    .order("added_at", { ascending: false })
    .range(params.from, params.to);

  if (error) throw new Error(error.message);
  const rows = (data ?? []).map((m) => ({
    email: m.email,
    name: m.name ?? "",
    added_at: m.added_at ?? "",
    added_by: m.added_by,
    roles: m.notes,
    org: m.org ?? "",
    type: normalizeType(m.member_type),
  })) as MemberRow[];
  return { rows, total: count ?? 0 };
}

function pickOne(sp: Record<string, string | string[] | undefined>, k: string): string {
  const v = sp[k];
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function CommitteeManagementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pagination = parsePagination(sp);
  const q = pickOne(sp, "q");
  const typeFilter = pickOne(sp, "type");
  const { rows, total } = await loadMembers(pagination, q, typeFilter);
  const canOperate = await viewerCanOperate();
  return (
    <CommitteeManagementClient
      initial={rows}
      total={total}
      page={pagination.page}
      pageSize={pagination.pageSize}
      initialQ={q}
      initialType={typeFilter}
      canOperate={canOperate}
    />
  );
}

// Only admins and chairmen may add/edit/remove members (mirrors the API).
async function viewerCanOperate(): Promise<boolean> {
  // Committee members sign in via Supabase Auth; the legacy psec_admin cookie is only set for the ADMIN_EMAIL login.
  let email: string | null = null;
  try {
    const session = await createClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    email = user?.email ?? null;
  } catch {
    email = null;
  }
  if (!email) email = await readAdminSession();

  // No resolvable session — allow locally (dev/bypass), deny in production.
  if (!email) return process.env.NODE_ENV !== "production";

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("admin_users")
    .select("member_type")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  const type = normalizeType(data?.member_type);
  return type === "admin" || type === "chairman";
}
