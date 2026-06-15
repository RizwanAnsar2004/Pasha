// Super-admin CRUD for the admin_users allowlist.
//
// GET    → list all admins
// POST   → add an admin (also pre-creates the Supabase auth user with
//          email_confirm=true so their first magic-link sign-in works)
// DELETE → remove an admin (does NOT delete the Supabase auth user;
//          revoking allowlist membership is enough — they'll be locked
//          out of /admin even if their session cookie is still around)

import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { readSuperAdminSession } from "@/lib/super-admin";
import { bustAdminAllowlistCache } from "@/lib/admin-allowlist";

const addSchema = z.object({
  email: z.string().email(),
  notes: z.string().max(200).optional(),
});

const removeSchema = z.object({
  email: z.string().email(),
});

async function requireSuperAdmin() {
  const sub = await readSuperAdminSession();
  if (!sub) {
    return {
      sub: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { sub, error: null };
}

export async function GET() {
  const { sub, error } = await requireSuperAdmin();
  if (!sub) return error!;
  const supabase = createServiceClient();
  const { data, error: dbErr } = await supabase
    .from("admin_users")
    .select("email, added_at, added_by, notes")
    .order("added_at", { ascending: true });
  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }
  return NextResponse.json({ admins: data ?? [] });
}

export async function POST(req: Request) {
  const { sub, error } = await requireSuperAdmin();
  if (!sub) return error!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const email = parsed.data.email.toLowerCase();
  const notes = parsed.data.notes ?? null;

  const supabase = createServiceClient();

  // 1. Insert into the allowlist (no-op if already present).
  const { error: insErr } = await supabase
    .from("admin_users")
    .upsert({ email, added_by: sub, notes }, { onConflict: "email" });
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // 2. Pre-create their Supabase Auth user with email_confirm=true so the
  //    very first magic-link sign-in works without an extra confirm step.
  //    If the user already exists, the create call 4xx's and we ignore it.
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`,
      {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          email_confirm: true,
          app_metadata: { role: "admin", provider: "super-admin-portal" },
        }),
      }
    );
  } catch (e) {
    console.warn("auth user precreate failed (non-fatal):", e);
  }

  // 3. Audit log entry. Best-effort.
  await supabase
    .from("audit_log")
    .insert({
      actor_id: null,
      actor_email: sub,
      action: "admin_users.add",
      resource_type: "admin_users",
      resource_id: email,
      payload: { added_by: sub, notes },
    })
    .then(() => {}, () => {});

  bustAdminAllowlistCache();
  return NextResponse.json({ ok: true, email });
}

export async function DELETE(req: Request) {
  const { sub, error } = await requireSuperAdmin();
  if (!sub) return error!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = removeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const email = parsed.data.email.toLowerCase();
  if (email === sub) {
    return NextResponse.json(
      { error: "Cannot remove the super-admin account from the allowlist." },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { error: delErr } = await supabase
    .from("admin_users")
    .delete()
    .eq("email", email);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  await supabase
    .from("audit_log")
    .insert({
      actor_id: null,
      actor_email: sub,
      action: "admin_users.remove",
      resource_type: "admin_users",
      resource_id: email,
      payload: { removed_by: sub },
    })
    .then(() => {}, () => {});

  bustAdminAllowlistCache();
  return NextResponse.json({ ok: true, email });
}
