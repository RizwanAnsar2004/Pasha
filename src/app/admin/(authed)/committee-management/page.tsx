import { createServiceClient } from "@/lib/supabase/server";
import { CommitteeManagementClient } from "./CommitteeManagementClient";
import { parsePagination } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export type MemberRow = {
  email: string;
  added_at: string;
  added_by: string | null;
  roles: string | null;
  org: string;
};

async function loadMembers(params: { from: number; to: number }, q: string) {
  const supabase = createServiceClient();
  let query = supabase
    .from("admin_users")
    .select("email, added_at, added_by, notes, org", { count: "exact" });
  if (q.length >= 1) {
    const pattern = `%${q}%`;
    query = query.or(`email.ilike.${pattern},notes.ilike.${pattern},org.ilike.${pattern}`);
  }
  const { data, count, error } = await query
    .order("added_at", { ascending: true })
    .range(params.from, params.to);

  if (error) throw new Error(error.message);
  const rows = (data ?? []).map((m) => ({
    email: m.email,
    added_at: m.added_at ?? "",
    added_by: m.added_by,
    roles: m.notes,
    org: m.org ?? "",
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
  const { rows, total } = await loadMembers(pagination, q);
  return (
    <CommitteeManagementClient
      initial={rows}
      total={total}
      page={pagination.page}
      pageSize={pagination.pageSize}
      initialQ={q}
    />
  );
}
