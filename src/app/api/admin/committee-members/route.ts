import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSessionClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail, bustAdminAllowlistCache } from "@/lib/admin-allowlist";
import { parsePagination } from "@/lib/pagination";

const addSchema = z.object({
  email: z.string().email(),
  roles: z.string().max(200).optional(),
  org: z.string().max(200).optional(),
});

const patchSchema = z.object({
  email: z.string().email(),
  roles: z.string().max(200).optional(),
  org: z.string().max(200).optional(),
});

const removeSchema = z.object({
  email: z.string().email(),
});

const MEMBER_COLS = "email, added_at, added_by, notes, org";

function mapMember(m: Record<string, unknown>) {
  return {
    email: m.email,
    added_at: m.added_at ?? "",
    added_by: m.added_by,
    roles: m.notes,
    org: m.org ?? "",
  };
}

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

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const { page, pageSize, from, to } = parsePagination(url);
  const supabase = createServiceClient();
  let query = supabase
    .from("admin_users")
    .select("email, added_at, added_by, notes, org", { count: "exact" });
  if (q.length >= 1) {
    const pattern = `%${q}%`;
    query = query.or(`email.ilike.${pattern},notes.ilike.${pattern},org.ilike.${pattern}`);
  }
  const { data, count, error: dbErr } = await query
    .order("added_at", { ascending: true })
    .range(from, to);

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }
  const members = (data ?? []).map((m) => mapMember(m as Record<string, unknown>));
  return NextResponse.json({ members, total: count ?? 0, page, pageSize });
}

export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const parsed = addSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const roles = parsed.data.roles?.trim() || null;
  const org = parsed.data.org?.trim() ?? "";
  const actor = user.email?.toLowerCase() ?? null;
  const supabase = createServiceClient();

  const { error: insErr } = await supabase
    .from("admin_users")
    .upsert({ email, added_by: actor, notes: roles, org }, { onConflict: "email" });
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  await supabase
    .from("audit_log")
    .insert({
      actor_id: user.id ?? null,
      actor_email: actor,
      action: "admin_users.add",
      resource_type: "admin_users",
      resource_id: email,
      payload: { added_by: actor, roles, org },
    })
    .then(() => {}, () => {});

  bustAdminAllowlistCache();
  return NextResponse.json({ ok: true, email });
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

  const email = parsed.data.email.toLowerCase();
  const supabase = createServiceClient();
  const updates: Record<string, unknown> = {};
  if (parsed.data.roles !== undefined) updates.notes = parsed.data.roles.trim() || null;
  if (parsed.data.org !== undefined) updates.org = parsed.data.org.trim();

  const { data, error: updErr } = await supabase
    .from("admin_users")
    .update(updates)
    .eq("email", email)
    .select(MEMBER_COLS)
    .maybeSingle();

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  return NextResponse.json({ member: mapMember(data as Record<string, unknown>) });
}

export async function DELETE(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const parsed = removeSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const target = parsed.data.email.toLowerCase();
  const actor = user.email?.toLowerCase() ?? null;

  if (actor && target === actor) {
    return NextResponse.json(
      { error: "You cannot remove your own committee access." },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { error: delErr } = await supabase.from("admin_users").delete().eq("email", target);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  await supabase
    .from("audit_log")
    .insert({
      actor_id: user.id ?? null,
      actor_email: actor,
      action: "admin_users.remove",
      resource_type: "admin_users",
      resource_id: target,
      payload: { removed_by: actor },
    })
    .then(() => {}, () => {});

  bustAdminAllowlistCache();
  return NextResponse.json({ ok: true, email: target });
}
