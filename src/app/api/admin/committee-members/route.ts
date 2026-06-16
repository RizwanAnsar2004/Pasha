import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSessionClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail, bustAdminAllowlistCache } from "@/lib/admin-allowlist";

const addSchema = z.object({
  email: z.string().email(),
  roles: z.string().max(200).optional(),
});

const removeSchema = z.object({
  email: z.string().email(),
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

export async function GET() {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const supabase = createServiceClient();
  const { data, error: dbErr } = await supabase
    .from("admin_users")
    .select("email, added_at, added_by, notes")
    .order("added_at", { ascending: true });

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }
  const members = (data ?? []).map((m) => ({
    email: m.email,
    added_at: m.added_at,
    added_by: m.added_by,
    roles: m.notes,
  }));
  return NextResponse.json({ members });
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
  const actor = user.email?.toLowerCase() ?? null;
  const supabase = createServiceClient();

  const { error: insErr } = await supabase
    .from("admin_users")
    .upsert({ email, added_by: actor, notes: roles }, { onConflict: "email" });
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
      payload: { added_by: actor, roles },
    })
    .then(() => {}, () => {});

  bustAdminAllowlistCache();
  return NextResponse.json({ ok: true, email });
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
  const { error: delErr } = await supabase
    .from("admin_users")
    .delete()
    .eq("email", target);
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
