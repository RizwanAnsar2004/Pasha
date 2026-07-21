import { createServiceClient } from "@/lib/supabase/server";
import { parsePagination } from "@/lib/utils/pagination";
import { EMAIL_TEMPLATE_COLS, type EmailTemplateRow } from "@/lib/email/email-templates";
import { EmailTemplatesClient } from "./EmailTemplatesClient";

export const dynamic = "force-dynamic";

async function loadTemplates(params: { from: number; to: number }) {
  const supabase = createServiceClient();
  const { data, count, error } = await supabase
    .from("email_templates")
    .select(EMAIL_TEMPLATE_COLS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(params.from, params.to);

  if (error) {
    if (/email_templates|does not exist/i.test(error.message))
      return { rows: [] as EmailTemplateRow[], total: 0 };
    throw new Error(error.message);
  }

  const rows = (data ?? []).map((row) => ({
    ...row,
    placeholders:
      row.placeholders && typeof row.placeholders === "object" ? row.placeholders : {},
  })) as EmailTemplateRow[];
  return { rows, total: count ?? 0 };
}

export default async function EmailTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pagination = parsePagination(sp);
  const { rows, total } = await loadTemplates(pagination);
  return (
    <EmailTemplatesClient
      initial={rows}
      total={total}
      page={pagination.page}
      pageSize={pagination.pageSize}
    />
  );
}
