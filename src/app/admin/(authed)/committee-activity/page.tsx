import { createServiceClient } from "@/lib/supabase/server";
import {
  CommitteeActivityClient,
  type ActivityRow,
} from "./CommitteeActivityClient";
import { parsePagination } from "@/lib/utils/pagination";

export const dynamic = "force-dynamic";

async function loadActivities(params: { from: number; to: number }) {
  const supabase = createServiceClient();
  const { data, count, error } = await supabase
    .from("committee_activities")
    .select("id,title,type,description,status,author_email,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(params.from, params.to);

  if (error) {
    if (/committee_activities|does not exist/i.test(error.message)) {
      return { rows: [] as ActivityRow[], total: 0 };
    }
    throw new Error(error.message);
  }

  return { rows: (data ?? []) as ActivityRow[], total: count ?? 0 };
}

export default async function CommitteeActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pagination = parsePagination(sp);
  const { rows, total } = await loadActivities(pagination);
  return (
    <CommitteeActivityClient
      initial={rows}
      total={total}
      page={pagination.page}
      pageSize={pagination.pageSize}
    />
  );
}
