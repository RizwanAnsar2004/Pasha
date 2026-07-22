// Admin CRUD for the databank table.

import { NextResponse } from "next/server";
import {
  createClient as createSessionClient,
  createServiceClient,
} from "@/lib/supabase/server";
import { z } from "zod";
import { isAdminEmail } from "@/lib/auth/admin/admin-allowlist";
import { parsePagination } from "@/lib/utils/pagination";
import { fetchAllRowsBatched } from "@/lib/utils/csv";
import { notifyRagDatabank } from "@/lib/ai/rag-sync";
import { getOptionIndex } from "@/lib/options/index.server";
import {
  matchingOptionIds,
  optionFilterValues,
  optionIdFor,
  resolveOptionLabel,
} from "@/lib/options/resolve";
import { CACHE_NS, withCache, withInvalidate } from "@/lib/cache/index.server";

// Whitelist of columns an admin can edit.
const EDITABLE_COLUMNS = new Set([
  // identity / branding
  "startup_name",
  "company_name",
  "tagline",
  "logo_url",
  "website",
  "founded_date",

  // category
  "primary_industry",
  "secondary_industries",
  "business_types",
  "product_stage",

  // location
  "city",
  "hq_country",

  // incubation
  "nic_name",
  "incubation_stage",
  "cohort",
  "joining_date",

  // team & traction
  "total_employees",
  "female_employees",
  "jobs_created",
  "current_revenue",
  "investment_raised",
  "investment_commitment",
  "investment_raised_from",
  "number_of_customers",

  // rich text
  "startup_idea",
  "business_model",
  "social_impact",
  "sdgs",
  "video_pitch",

  // recognition / audit NOTE: `awards` is intentionally NOT editable here — awards are managed exclusively in Admin → Award Winners (startup_awards.
  "certifications",
  "pasha_verified",

  // contact (legacy flat — still useful for outreach)
  "contact_person",
  "contact_email",
  "outreach_status",
  "outreach_notes",

  // socials
  "company_linkedin",
  "company_x",
  "company_instagram",
  "company_facebook",
  "company_youtube",

  // key persons JSONB
  "key_persons",

  // dynamic admin-defined form fields (cover_image, etc.) JSONB
  "answers",
]);

const patchSchema = z.object({
  id: z.string().uuid(),
  updates: z.record(z.string(), z.unknown()),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

const LIST_COLS =
  "id,startup_name,tagline,primary_industry,nic_name,city,contact_person,contact_email,outreach_status,current_revenue,investment_raised,total_employees,website,pasha_verified,created_at,source";

async function requireAdmin() {
  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user || !(await isAdminEmail(user.email))) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user, error: null };
}

async function getHandler(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const sector = url.searchParams.get("sector")?.trim() ?? "";
  const outreach = url.searchParams.get("outreach")?.trim() ?? "";
  const verified = url.searchParams.get("verified")?.trim() ?? "";
  const all = url.searchParams.get("all") === "1";
  const { page, pageSize, from, to } = parsePagination(url);
  const supabase = createServiceClient();
  const optionIndex = await getOptionIndex();
  const term = q.replace(/[%,()]/g, " ").trim();

  // Fresh, filtered query each call — the builder can't be reused once awaited, and the export path needs to run it for several row ranges.
  const buildQuery = () => {
    let query = supabase.from("databank").select(LIST_COLS, { count: "exact" });
    if (term.length >= 1) {
      const pattern = `%${term}%`;
      const idMatches = matchingOptionIds(optionIndex, term).map(
        (id) => `primary_industry_id.eq.${id}`
      );
      query = query.or(
        [
          `startup_name.ilike.${pattern}`,
          `contact_email.ilike.${pattern}`,
          `contact_person.ilike.${pattern}`,
          `primary_industry.ilike.${pattern}`,
          ...idMatches,
        ].join(",")
      );
    }
    if (sector && sector !== "all") {
      const id = optionIdFor(optionIndex, "SECTORS", sector);
      if (id) {
        query = query.eq("primary_industry_id", id);
      } else {
        const values = optionFilterValues(optionIndex, "SECTORS", sector);
        query = values.length > 1 ? query.in("primary_industry", values) : query.eq("primary_industry", sector);
      }
    }
    if (outreach && outreach !== "all") query = query.eq("outreach_status", outreach);
    if (verified === "yes") query = query.eq("pasha_verified", true);
    if (verified === "no") query = query.or("pasha_verified.is.null,pasha_verified.eq.false");
    return query
      .order("created_at", { ascending: false, nullsFirst: false })
      .order("current_revenue", { ascending: false, nullsFirst: false });
  };

  // Choice columns may hold option ids, so present their labels to the client.
  const withLabels = (rows: Record<string, unknown>[]) =>
    rows.map((r) => ({
      ...r,
      primary_industry: resolveOptionLabel(optionIndex, "SECTORS", r.primary_industry as string | null),
      city: resolveOptionLabel(optionIndex, "HQ_CITIES", r.city as string | null),
      nic_name: resolveOptionLabel(optionIndex, "NIC_CENTERS", r.nic_name as string | null),
    }));

  if (all) {
    // Batch past PostgREST's 1000-row cap to export the whole filtered set.
    try {
      const { rows, total } = await fetchAllRowsBatched<Record<string, unknown>>((f, t) =>
        buildQuery().range(f, t)
      );
      return NextResponse.json({ rows: withLabels(rows), total, page, pageSize });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Export failed" },
        { status: 500 }
      );
    }
  }

  const { data, count, error: dbErr } = await buildQuery().range(from, to);
  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }
  return NextResponse.json({ rows: data ?? [], total: count ?? 0, page, pageSize });
}

async function patchHandler(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { id, updates } = parsed.data;

  // Drop unknown keys.
  const sanitised: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (EDITABLE_COLUMNS.has(k)) sanitised[k] = v;
  }
  if (Object.keys(sanitised).length === 0) {
    return NextResponse.json({ error: "No editable fields in payload" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Capture prior state for the audit log.
  const { data: prior } = await supabase
    .from("databank")
    .select(Array.from(EDITABLE_COLUMNS).join(","))
    .eq("id", id)
    .maybeSingle();

  if (!prior) {
    return NextResponse.json({ error: "Row not found" }, { status: 404 });
  }

  // If pasha_verified is being flipped to true and there's no prior verification timestamp, stamp it now.
  if ("pasha_verified" in sanitised) {
    const v = sanitised.pasha_verified;
    sanitised.pasha_verified_at = v === true ? new Date().toISOString() : null;
    sanitised.pasha_verified_by = v === true ? user.email : null;
  }

  const { error: updErr } = await supabase
    .from("databank")
    .update(sanitised)
    .eq("id", id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  const priorRow = prior as unknown as Record<string, unknown>;
  const diffPayload: Record<string, { prior: unknown; next: unknown }> = {};
  for (const k of Object.keys(sanitised)) {
    diffPayload[k] = { prior: priorRow[k], next: sanitised[k] };
  }
  const { error: auditErr } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_email: user.email,
    action: "databank.update",
    resource_type: "databank",
    resource_id: id,
    payload: diffPayload,
  });
  if (auditErr) console.error("audit_log insert failed:", auditErr.message);

  // Re-ingest this startup into the RAG vector store (best-effort).
  notifyRagDatabank("UPDATE", id);

  return NextResponse.json({ ok: true, id });
}

async function deleteHandler(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { id } = parsed.data;

  const supabase = createServiceClient();

  // Snapshot the row so the audit log preserves what was deleted.
  const { data: prior } = await supabase
    .from("databank")
    .select("startup_name, website, source")
    .eq("id", id)
    .maybeSingle();

  if (!prior) {
    return NextResponse.json({ error: "Row not found" }, { status: 404 });
  }

  const { error: delErr } = await supabase.from("databank").delete().eq("id", id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  const { error: auditErr } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_email: user.email,
    action: "databank.delete",
    resource_type: "databank",
    resource_id: id,
    payload: { prior },
  });
  if (auditErr) console.error("audit_log insert failed:", auditErr.message);

  // Drop this startup from the RAG vector store (best-effort).
  notifyRagDatabank("DELETE", id);

  return NextResponse.json({ ok: true, id });
}

// --- Redis cache wiring: read-through on GET, namespace invalidation on writes. ---
export const GET = withCache(CACHE_NS.databank, getHandler, { guard: requireAdmin });
export const PATCH = withInvalidate(CACHE_NS.databank, patchHandler);
export const DELETE = withInvalidate(CACHE_NS.databank, deleteHandler);
