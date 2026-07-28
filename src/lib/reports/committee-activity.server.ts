import "server-only";
import type { createServiceClient } from "@/lib/supabase/server";
import { fetchAllRowsBatched } from "@/lib/utils/csv";
import { getOptionIndex } from "@/lib/options/index.server";
import { resolveOptionLabel } from "@/lib/options/resolve";
import type { ActivityEventRow } from "@/lib/reports/submissions-report.server";

type ServiceClient = ReturnType<typeof createServiceClient>;

// Every action that is part of a startup's lifecycle (submit -> review ->
// databank -> verify -> featured -> award -> request-edit -> claim).
export const STARTUP_ACTIONS = [
  "submission.submitted",
  "submission.approved",
  "submission.rejected",
  "submission.needs_update",
  "submission.watchlist",
  "submission.pending",
  "submission.verify",
  "submission.unverify",
  "databank.update",
  "databank.delete",
  "databank.verify",
  "databank.unverify",
  "databank.request_edit",
  "edit_request.submitted",
  "featured.added",
  "featured.removed",
  "award.added",
  "award.updated",
  "award.removed",
  "company.claim",
];

// action -> human label (shared by the report + activity page).
export const ACTION_LABEL: Record<string, string> = {
  "submission.submitted": "Submitted",
  "submission.approved": "Approved",
  "submission.rejected": "Rejected",
  "submission.needs_update": "Update requested",
  "submission.watchlist": "Watchlisted",
  "submission.pending": "Pending",
  "submission.verify": "Verified",
  "submission.unverify": "Unverified",
  "databank.update": "Databank edited",
  "databank.delete": "Databank deleted",
  "databank.verify": "Verified",
  "databank.unverify": "Unverified",
  "databank.request_edit": "Info requested",
  "edit_request.submitted": "Info provided",
  "featured.added": "Featured",
  "featured.removed": "Unfeatured",
  "award.added": "Award added",
  "award.updated": "Award updated",
  "award.removed": "Award removed",
  "company.claim": "Profile claimed",
};

// The status-only subset, for deriving a "status" label in the committee report.
const STATUS_ACTIONS = STARTUP_ACTIONS.filter(
  (a) => a.startsWith("submission.") || a === "databank.verify" || a === "databank.unverify"
);

function deriveStatus(action: string): string {
  if (action === "submission.verify" || action === "databank.verify") return "verified";
  if (action === "submission.unverify" || action === "databank.unverify") return "unverified";
  return action.replace(/^submission\./, "");
}

type AuditRow = {
  action: string;
  resource_id: string | null;
  actor_email: string | null;
  payload: Record<string, unknown> | null;
  created_at: string | null;
};

// Shared audit_log query: an action set, a date window, and an optional name /
// actor search (name search resolves startup ids so it matches events keyed by
// either a submission OR a databank id).
async function fetchAuditEvents(
  supabase: ServiceClient,
  actions: string[],
  opts: { lo: string | null; hi: string | null; status?: string; q?: string }
): Promise<AuditRow[]> {
  const q = (opts.q ?? "").replace(/[%,()]/g, " ").trim();

  let startupIds: string[] = [];
  if (q) {
    const [{ data: subs }, { data: dbs }] = await Promise.all([
      supabase.from("submissions").select("id").ilike("startup_name", `%${q}%`).limit(300),
      supabase.from("databank").select("id").ilike("startup_name", `%${q}%`).limit(300),
    ]);
    startupIds = [
      ...(subs ?? []).map((r) => (r as { id: string }).id),
      ...(dbs ?? []).map((r) => (r as { id: string }).id),
    ];
  }

  const buildQuery = () => {
    let query = supabase
      .from("audit_log")
      .select("action,resource_id,actor_email,payload,created_at", { count: "exact" })
      .in("action", actions);
    if (opts.lo) query = query.gte("created_at", opts.lo);
    if (opts.hi) query = query.lte("created_at", opts.hi);
    if (q) {
      const orParts = [`actor_email.ilike.%${q}%`];
      if (startupIds.length > 0) orParts.push(`resource_id.in.(${startupIds.join(",")})`);
      query = query.or(orParts.join(","));
    }
    return query.order("created_at", { ascending: false });
  };

  const { rows } = await fetchAllRowsBatched<AuditRow>((f, t) => buildQuery().range(f, t));
  if (opts.status && opts.status !== "all") {
    return rows.filter((r) => deriveStatus(r.action) === opts.status);
  }
  return rows;
}

// Committee status activity (submissions report, change basis): status changes
// only, resolved to startup names.
export async function getStatusActivity(
  supabase: ServiceClient,
  opts: { lo: string | null; hi: string | null; status?: string; q?: string }
): Promise<ActivityEventRow[]> {
  const rows = await fetchAuditEvents(supabase, STATUS_ACTIONS, opts);
  const names = await resolveNames(supabase, rows);
  return rows.map((r) => {
    const isSub = r.action.startsWith("submission.");
    return {
      startup_name: startupNameFor(r, isSub, names),
      status: deriveStatus(r.action),
      previous_status: null,
      actor_email: r.actor_email,
      entity_type: isSub ? "submission" : "databank",
      created_at: r.created_at,
    };
  });
}

// id -> startup_name, from both submissions and databank.
async function resolveNames(supabase: ServiceClient, rows: AuditRow[]): Promise<Map<string, string>> {
  const ids = [...new Set(rows.map((r) => r.resource_id).filter((v): v is string => Boolean(v)))];
  const names = new Map<string, string>();
  if (ids.length === 0) return names;
  const [{ data: subs }, { data: dbs }] = await Promise.all([
    supabase.from("submissions").select("id,startup_name").in("id", ids),
    supabase.from("databank").select("id,startup_name").in("id", ids),
  ]);
  for (const x of (subs ?? []) as { id: string; startup_name: string | null }[]) if (x.startup_name) names.set(x.id, x.startup_name);
  for (const x of (dbs ?? []) as { id: string; startup_name: string | null }[]) if (x.startup_name) names.set(x.id, x.startup_name);
  return names;
}

function startupNameFor(r: AuditRow, _isSub: boolean, names: Map<string, string>): string | null {
  const byId = r.resource_id ? names.get(r.resource_id) : null;
  const fromPayload = typeof r.payload?.startup_name === "string" ? (r.payload.startup_name as string) : null;
  return byId ?? fromPayload ?? null;
}

// ── Enriched activity: each audit event joined to its submission AND databank ─
export type EnrichedActivityRow = {
  created_at: string | null;
  action: string;
  action_label: string;
  actor_email: string | null;
  startup_name: string | null;
  sector: string | null;
  city: string | null;
  founder_name: string | null;
  tier: string | null;
  score: number | null;
  current_status: string | null;
  revenue: number | null;
  investment: number | null;
  verified: boolean;
  details: string | null;
};

type SubRow = {
  id: string;
  startup_name: string | null;
  primary_sector: string | null;
  hq_city: string | null;
  hq_other: string | null;
  founder_name: string | null;
  vetting_tier: string | null;
  vetting_score: number | null;
  status: string | null;
};
type DbRow = {
  id: string;
  source_id: string | null;
  startup_name: string | null;
  primary_industry: string | null;
  city: string | null;
  contact_person: string | null;
  current_revenue: number | null;
  investment_raised: number | null;
  pasha_verified: boolean | null;
};

function detailsOf(payload: Record<string, unknown> | null): string {
  const p = payload ?? {};
  const bits: string[] = [];
  if (typeof p.title === "string") bits.push(p.title);
  if (p.year) bits.push(String(p.year));
  if (typeof p.tier === "string") bits.push(`tier ${p.tier}`);
  if (p.resubmit === true) bits.push("resubmission");
  if (typeof p.featured_until === "string") bits.push(`until ${(p.featured_until as string).slice(0, 10)}`);
  return bits.join(" · ");
}

// Filtered audit events joined to submissions + databank (both directions:
// submission events pull their published databank row by source_id; databank
// events pull their originating submission by databank.source_id).
export async function getEnrichedActivity(
  supabase: ServiceClient,
  opts: { lo: string | null; hi: string | null; action?: string; q?: string }
): Promise<EnrichedActivityRow[]> {
  const actions =
    opts.action && opts.action !== "startup" && opts.action !== "all" && STARTUP_ACTIONS.includes(opts.action)
      ? [opts.action]
      : STARTUP_ACTIONS;
  const rows = await fetchAuditEvents(supabase, actions, { lo: opts.lo, hi: opts.hi, q: opts.q });

  const subIds = new Set<string>();
  const dbIds = new Set<string>();
  for (const r of rows) {
    if (!r.resource_id) continue;
    if (r.action.startsWith("submission.")) subIds.add(r.resource_id);
    else dbIds.add(r.resource_id);
  }

  const SUB_COLS = "id,startup_name,primary_sector,hq_city,hq_other,founder_name,vetting_tier,vetting_score,status";
  const DB_COLS = "id,source_id,startup_name,primary_industry,city,contact_person,current_revenue,investment_raised,pasha_verified";

  // Submission-keyed events: the submission + its databank row (by source_id).
  // Databank-keyed events: the databank row + its submission (by source_id).
  const [subById, dbById, dbBySource] = await Promise.all([
    subIds.size ? fetchMap<SubRow>(supabase, "submissions", SUB_COLS, "id", [...subIds]) : new Map<string, SubRow>(),
    dbIds.size ? fetchMap<DbRow>(supabase, "databank", DB_COLS, "id", [...dbIds]) : new Map<string, DbRow>(),
    subIds.size ? fetchMap<DbRow>(supabase, "databank", DB_COLS, "source_id", [...subIds]) : new Map<string, DbRow>(),
  ]);
  // For databank events, pull their originating submissions by source_id.
  const sourceIds = [...dbById.values()].map((d) => d.source_id).filter((v): v is string => Boolean(v));
  const subBySourceId = sourceIds.length ? await fetchMap<SubRow>(supabase, "submissions", SUB_COLS, "id", sourceIds) : new Map<string, SubRow>();

  const optionIndex = await getOptionIndex();
  const sectorLabel = (v: string | null | undefined) => resolveOptionLabel(optionIndex, "SECTORS", v ?? null);
  const cityLabel = (v: string | null | undefined) => resolveOptionLabel(optionIndex, "HQ_CITIES", v ?? null);

  return rows.map((r) => {
    const isSub = r.action.startsWith("submission.");
    const sub = isSub
      ? (r.resource_id ? subById.get(r.resource_id) : undefined)
      : (() => {
          const db = r.resource_id ? dbById.get(r.resource_id) : undefined;
          return db?.source_id ? subBySourceId.get(db.source_id) : undefined;
        })();
    const db = isSub
      ? (r.resource_id ? dbBySource.get(r.resource_id) : undefined)
      : (r.resource_id ? dbById.get(r.resource_id) : undefined);

    return {
      created_at: r.created_at,
      action: r.action,
      action_label: ACTION_LABEL[r.action] ?? r.action,
      actor_email: r.actor_email,
      startup_name:
        sub?.startup_name ?? db?.startup_name ??
        (typeof r.payload?.startup_name === "string" ? (r.payload.startup_name as string) : null),
      sector: sectorLabel(sub?.primary_sector ?? db?.primary_industry),
      city: cityLabel(sub?.hq_city ?? db?.city) || (sub?.hq_other ?? null),
      founder_name: sub?.founder_name ?? db?.contact_person ?? null,
      tier: sub?.vetting_tier ?? null,
      score: sub?.vetting_score ?? null,
      current_status: sub?.status ?? null,
      revenue: db?.current_revenue ?? null,
      investment: db?.investment_raised ?? null,
      verified: Boolean(db?.pasha_verified),
      details: detailsOf(r.payload),
    };
  });
}

// Fetch rows and index them by a key column into a Map.
async function fetchMap<T>(
  supabase: ServiceClient,
  table: string,
  cols: string,
  keyCol: string,
  ids: string[]
): Promise<Map<string, T>> {
  const map = new Map<string, T>();
  const { data } = await supabase.from(table).select(cols).in(keyCol, ids);
  for (const row of (data ?? []) as unknown as T[]) {
    const key = (row as Record<string, unknown>)[keyCol];
    if (typeof key === "string") map.set(key, row);
  }
  return map;
}
