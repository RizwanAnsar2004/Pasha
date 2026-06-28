import { createServiceClient } from "@/lib/supabase/server";
import { format, parseISO } from "date-fns";
import { parsePagination } from "@/lib/pagination";
import { Pagination } from "../_components/Pagination";

export const dynamic = "force-dynamic";

type SendRow = {
  id: string;
  template_id: string | null;
  kind: string;
  subject: string;
  created_by: string | null;
  created_at: string;
};

type Counts = { total: number; sent: number; failed: number; queued: number };

async function loadLog(range: { from: number; to: number }) {
  const supabase = createServiceClient();
  const { data: sends, count, error } = await supabase
    .from("email_sends")
    .select("id, template_id, kind, subject, created_by, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(range.from, range.to);

  if (error) {
    if (/email_sends|does not exist/i.test(error.message))
      return { rows: [], counts: {} as Record<string, Counts>, names: {} as Record<string, string>, total: 0 };
    throw new Error(error.message);
  }

  const sendRows = (sends ?? []) as SendRow[];
  const sendIds = sendRows.map((s) => s.id);
  const templateIds = [...new Set(sendRows.map((s) => s.template_id).filter(Boolean))] as string[];

  const [{ data: recs }, { data: tpls }] = await Promise.all([
    sendIds.length
      ? supabase.from("email_recipients").select("send_id, status").in("send_id", sendIds)
      : Promise.resolve({ data: [] as { send_id: string; status: string }[] }),
    templateIds.length
      ? supabase.from("email_templates").select("id, name, template_id").in("id", templateIds)
      : Promise.resolve({ data: [] as { id: string; name: string; template_id: string }[] }),
  ]);

  const counts: Record<string, Counts> = {};
  for (const r of (recs ?? []) as { send_id: string; status: string }[]) {
    const c = (counts[r.send_id] ??= { total: 0, sent: 0, failed: 0, queued: 0 });
    c.total += 1;
    if (r.status === "sent") c.sent += 1;
    else if (r.status === "failed") c.failed += 1;
    else c.queued += 1;
  }

  const names: Record<string, string> = {};
  for (const t of (tpls ?? []) as { id: string; name: string; template_id: string }[]) {
    names[t.id] = t.name || t.template_id;
  }

  return { rows: sendRows, counts, names, total: count ?? 0 };
}

export default async function EmailLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pagination = parsePagination(sp);
  const { rows, counts, names, total } = await loadLog(pagination);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-pasha-ink">Email Log</h1>
        <p className="mt-1 text-sm text-pasha-muted">
          Every email send — automated and broadcast — with per-recipient delivery status.
        </p>
      </div>

      <div className="rounded-2xl border border-pasha-line bg-white overflow-hidden shadow-sm">
        {rows.length === 0 ? (
          <p className="px-6 py-12 text-sm text-pasha-muted text-center">No emails sent yet.</p>
        ) : (
          <div className="divide-y divide-pasha-line">
            {rows.map((s) => {
              const c = counts[s.id] ?? { total: 0, sent: 0, failed: 0, queued: 0 };
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-pasha-stone/30">
                  <div className="flex-1 min-w-[220px]">
                    <p className="font-medium text-pasha-ink">{s.subject || "(no subject)"}</p>
                    <p className="mt-0.5 text-xs text-pasha-muted flex flex-wrap items-center gap-2">
                      <span className="font-mono">{s.template_id ? names[s.template_id] ?? "—" : "—"}</span>
                      <span>· {format(parseISO(s.created_at), "MMM d, yyyy HH:mm")}</span>
                      {s.created_by && <span>· {s.created_by}</span>}
                    </p>
                  </div>
                  <span className="rounded-md bg-pasha-stone/80 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[1px] text-pasha-ink/70">
                    {s.kind}
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge label={`${c.total} total`} cls="bg-pasha-stone text-pasha-ink/70" />
                    {c.sent > 0 && <Badge label={`${c.sent} sent`} cls="bg-tier-featured/10 text-tier-featured" />}
                    {c.queued > 0 && <Badge label={`${c.queued} queued`} cls="bg-amber-50 text-amber-700" />}
                    {c.failed > 0 && <Badge label={`${c.failed} failed`} cls="bg-pasha-red/10 text-pasha-red" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Pagination total={total} page={pagination.page} pageSize={pagination.pageSize} />
      </div>
    </div>
  );
}

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`rounded-md px-2 py-0.5 font-medium ${cls}`}>{label}</span>;
}
