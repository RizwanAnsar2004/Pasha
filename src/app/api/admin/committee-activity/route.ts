import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSessionClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin/admin-allowlist";
import { parsePagination } from "@/lib/utils/pagination";
import { fetchAllRowsBatched } from "@/lib/utils/csv";
import { CACHE_NS, withCache, withInvalidate } from "@/lib/cache/index.server";

const ACTIVITY_TYPES = [
  "verification",
  "report",
  "program",
  "event",
  "update",
  "initiative",
] as const;

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: z.enum(ACTIVITY_TYPES),
  description: z.string().trim().min(1).max(2000),
});

const patchSchema = createSchema.extend({
  id: z.string().uuid(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

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

async function safeJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

async function getHandler(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const url = new URL(req.url);
  const all = url.searchParams.get("all") === "1";
  const { page, pageSize, from, to } = parsePagination(url);
  const supabase = createServiceClient();
  const buildQuery = () =>
    supabase
      .from("committee_activities")
      .select("id,title,type,description,status,author_email,created_at", { count: "exact" })
      .order("created_at", { ascending: false });

  if (all) {
    // Batch past PostgREST's 1000-row cap to export every activity.
    try {
      const { rows, total } = await fetchAllRowsBatched<Record<string, unknown>>((f, t) =>
        buildQuery().range(f, t)
      );
      return NextResponse.json({ activities: rows, total, page, pageSize });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Export failed";
      if (/committee_activities|does not exist/i.test(msg)) {
        return NextResponse.json({ activities: [], total: 0, page, pageSize });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  const { data, count, error: dbErr } = await buildQuery().range(from, to);

  if (dbErr) {
    if (/committee_activities|does not exist/i.test(dbErr.message)) {
      return NextResponse.json({ activities: [], total: 0, page, pageSize });
    }
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ activities: data ?? [], total: count ?? 0, page, pageSize });
}

async function postHandler(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const parsed = createSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data, error: insErr } = await supabase
    .from("committee_activities")
    .insert({
      ...parsed.data,
      author_email: user.email,
      status: "published",
    })
    .select("id,title,type,description,status,author_email,created_at")
    .single();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ activity: data });
}

async function patchHandler(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const parsed = patchSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }

  const { id, ...fields } = parsed.data;
  const supabase = createServiceClient();
  const { data, error: updErr } = await supabase
    .from("committee_activities")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id,title,type,description,status,author_email,created_at")
    .single();

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  }

  return NextResponse.json({ activity: data });
}

async function deleteHandler(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const parsed = deleteSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error: delErr } = await supabase
    .from("committee_activities")
    .delete()
    .eq("id", parsed.data.id);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// --- Redis cache wiring: read-through on GET, namespace invalidation on writes. ---
export const GET = withCache(CACHE_NS.committeeActivity, getHandler, { guard: requireAdmin });
export const POST = withInvalidate(CACHE_NS.committeeActivity, postHandler);
export const PATCH = withInvalidate(CACHE_NS.committeeActivity, patchHandler);
export const DELETE = withInvalidate(CACHE_NS.committeeActivity, deleteHandler);
