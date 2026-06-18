import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSessionClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-allowlist";
import { parsePagination } from "@/lib/pagination";

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

export async function GET(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const { page, pageSize, from, to } = parsePagination(new URL(req.url));
  const supabase = createServiceClient();
  const { data, count, error: dbErr } = await supabase
    .from("committee_activities")
    .select("id,title,type,description,status,author_email,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (dbErr) {
    if (/committee_activities|does not exist/i.test(dbErr.message)) {
      return NextResponse.json({ activities: [], total: 0, page, pageSize });
    }
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ activities: data ?? [], total: count ?? 0, page, pageSize });
}

export async function POST(req: Request) {
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

export async function PATCH(req: Request) {
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

export async function DELETE(req: Request) {
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
