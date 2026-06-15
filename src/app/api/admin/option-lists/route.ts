// Admin CRUD for reusable option lists (option_lists table). Lets admins create
// new choice lists and override the code-defined built-ins (a DB row whose name
// matches a code list wins at render time). Fields reference a list by name via
// options_source.
//
// Auth: authenticated Supabase session + email in the admin allowlist.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSessionClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-allowlist";
import { getOptionListsForAdmin } from "@/lib/option-lists.server";

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

const itemSchema = z.object({
  value: z.string().trim().min(1),
  label: z.string().trim().min(1),
});

const upsertSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9_]+$/, "Use letters, numbers and underscores only"),
  label: z.string().trim().max(120).optional(),
  items: z.array(itemSchema),
});

// GET — all lists for the manager (code + DB + overrides).
export async function GET() {
  const { user, error } = await requireAdmin();
  if (!user) return error!;
  return NextResponse.json({ lists: await getOptionListsForAdmin() });
}

// POST — create a new list, or create a DB override of a code list.
export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;
  const parsed = upsertSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }
  const { name, label, items } = parsed.data;
  const supabase = createServiceClient();
  const { error: insErr } = await supabase
    .from("option_lists")
    .insert({ name, label: label ?? name, items });
  if (insErr) {
    const conflict = /duplicate|unique/i.test(insErr.message);
    return NextResponse.json(
      { error: conflict ? `A list named "${name}" already exists` : insErr.message },
      { status: conflict ? 409 : 500 }
    );
  }
  return NextResponse.json({ ok: true });
}

// PATCH — update an existing DB list by name.
export async function PATCH(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;
  const parsed = upsertSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }
  const { name, label, items } = parsed.data;
  const supabase = createServiceClient();
  const { error: updErr } = await supabase
    .from("option_lists")
    .update({ label: label ?? name, items, updated_at: new Date().toISOString() })
    .eq("name", name);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — remove a DB list (reverts to the code default if one exists).
export async function DELETE(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;
  const body = (await safeJson(req)) as { name?: string };
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Missing list name" }, { status: 400 });
  const supabase = createServiceClient();
  const { error: delErr } = await supabase.from("option_lists").delete().eq("name", name);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

async function safeJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
