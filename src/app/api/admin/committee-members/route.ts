import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSessionClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail, bustAdminAllowlistCache } from "@/lib/auth/admin/admin-allowlist";
import { parsePagination } from "@/lib/utils/pagination";
import { provisionSupabaseAuthUser, deleteSupabaseAuthUser } from "@/lib/auth/admin/admin-auth-provision";
import { generatePassword, sendCommitteeInvite } from "@/lib/committee/committee-invite";
import { emailOrigin } from "@/lib/utils/site-url";

const memberTypeSchema = z.enum(["chairman", "member", "admin"]);

const addSchema = z.object({
  email: z.string().email(),
  name: z.string().max(200).optional(),
  // Admin-set sign-in password for the new member.
  password: z.string().min(8, "Password must be at least 8 characters.").max(200).optional(),
  roles: z.string().max(200).optional(),
  org: z.string().max(200).optional(),
  type: memberTypeSchema.optional(),
});

const patchSchema = z.object({
  email: z.string().email(),
  name: z.string().max(200).optional(),
  roles: z.string().max(200).optional(),
  org: z.string().max(200).optional(),
  type: memberTypeSchema.optional(),
});

const removeSchema = z.object({
  email: z.string().email(),
});

const MEMBER_COLS = "email, added_at, added_by, notes, org, member_type, name";

function mapMember(m: Record<string, unknown>) {
  return {
    email: m.email,
    name: m.name ?? "",
    added_at: m.added_at ?? "",
    added_by: m.added_by,
    roles: m.notes,
    org: m.org ?? "",
    type: m.member_type ?? "member",
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

// Only admins and committee chairmen may mutate committee members.
async function requireOperator() {
  const { user, error } = await requireAdmin();
  if (!user) return { user: null, error: error! };
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("admin_users")
    .select("member_type")
    .eq("email", user.email?.toLowerCase() ?? "")
    .maybeSingle();
  const memberType = (data?.member_type as string | undefined) ?? "member";
  if (memberType !== "admin" && memberType !== "chairman") {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Only admins and chairmen can manage committee members." },
        { status: 403 }
      ),
    };
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
    .select(MEMBER_COLS, { count: "exact" });
  if (q.length >= 1) {
    const pattern = `%${q}%`;
    query = query.or(
      `email.ilike.${pattern},name.ilike.${pattern},notes.ilike.${pattern},org.ilike.${pattern}`
    );
  }
  const { data, count, error: dbErr } = await query
    .order("updated_at", { ascending: false })
    .order("added_at", { ascending: false })
    .range(from, to);

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }
  const members = (data ?? []).map((m) => mapMember(m as Record<string, unknown>));
  return NextResponse.json({ members, total: count ?? 0, page, pageSize });
}

export async function POST(req: Request) {
  const { user, error } = await requireOperator();
  if (!user) return error!;

  const parsed = addSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const name = parsed.data.name?.trim() || null;
  const roles = parsed.data.roles?.trim() || null;
  const org = parsed.data.org?.trim() ?? "";
  const memberType = parsed.data.type ?? "member";
  const actor = user.email?.toLowerCase() ?? null;
  const supabase = createServiceClient();

  const { error: insErr } = await supabase
    .from("admin_users")
    .upsert(
      {
        email,
        added_by: actor,
        name,
        notes: roles,
        org,
        member_type: memberType,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  bustAdminAllowlistCache();

  // Provision a Supabase Auth account with a generated password and email the new member their sign-in details.
  let provisioned = false;
  let emailed = false;
  let emailError: string | undefined;
  let fallbackPassword: string | undefined;

  // Use the admin-entered password; fall back to a generated one if omitted.
  const password = parsed.data.password?.trim() || generatePassword();
  provisioned = await provisionSupabaseAuthUser(email, password);
  if (provisioned) {
    const sendRes = await sendCommitteeInvite({
      email,
      role: roles,
      password,
      createdBy: actor,
      origin: emailOrigin(),
    });
    emailed = sendRes.ok;
    if (!sendRes.ok) {
      emailError = sendRes.error;
      fallbackPassword = password; // surface so the admin can deliver it manually
    }
  }

  await supabase
    .from("audit_log")
    .insert({
      actor_id: user.id ?? null,
      actor_email: actor,
      action: "admin_users.add",
      resource_type: "admin_users",
      resource_id: email,
      payload: { added_by: actor, roles, org, provisioned, emailed },
    })
    .then(() => {}, () => {});

  return NextResponse.json({
    ok: true,
    email,
    provisioned,
    emailed,
    ...(emailError ? { emailError } : {}),
    ...(fallbackPassword ? { password: fallbackPassword } : {}),
  });
}

export async function PATCH(req: Request) {
  const { user, error } = await requireOperator();
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
  if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim() || null;
  if (parsed.data.roles !== undefined) updates.notes = parsed.data.roles.trim() || null;
  if (parsed.data.org !== undefined) updates.org = parsed.data.org.trim();
  if (parsed.data.type !== undefined) updates.member_type = parsed.data.type;
  updates.updated_at = new Date().toISOString();

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
  const { user, error } = await requireOperator();
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

  // Also delete the Supabase Auth account so the removed member can no longer authenticate (the allowlist row alone doesn't revoke an existing.
  const authDeleted = await deleteSupabaseAuthUser(target);

  await supabase
    .from("audit_log")
    .insert({
      actor_id: user.id ?? null,
      actor_email: actor,
      action: "admin_users.remove",
      resource_type: "admin_users",
      resource_id: target,
      payload: { removed_by: actor, authDeleted },
    })
    .then(() => {}, () => {});

  bustAdminAllowlistCache();
  return NextResponse.json({ ok: true, email: target, authDeleted });
}
