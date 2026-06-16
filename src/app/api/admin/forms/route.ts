// Admin CRUD for the form builder (form_sections / form_fields). Lets admins
// define the public apply form: sections (steps), fields, input types,
// validations, and repeatable subsections.
//
// Auth: authenticated Supabase session + email in the admin allowlist.
// Every mutation writes an audit_log entry.

import { NextResponse } from "next/server";
import {
  createClient as createSessionClient,
  createServiceClient,
} from "@/lib/supabase/server";
import { z } from "zod";
import { isAdminEmail } from "@/lib/admin-allowlist";

const SECTION_COLS = new Set([
  "key",
  "title",
  "subtitle",
  "step",
  "sort_order",
  "is_active",
  "form_key",
]);

const FIELD_COLS = new Set([
  "section_id",
  "parent_field_id",
  "field_key",
  "label",
  "hint",
  "placeholder",
  "input_type",
  "required",
  "validation",
  "options",
  "options_source",
  "repeatable",
  "min_items",
  "max_items",
  "item_label",
  "column_map",
  "visible",
  "sort_order",
  "conditional",
]);

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

function pick(obj: Record<string, unknown>, allowed: Set<string>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (allowed.has(k)) out[k] = v;
  return out;
}

async function audit(
  supabase: ReturnType<typeof createServiceClient>,
  user: { id: string; email?: string },
  action: string,
  resourceId: string,
  payload: unknown
) {
  const { error } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_email: user.email,
    action,
    resource_type: "form",
    resource_id: resourceId,
    payload,
  });
  if (error) console.error("audit_log insert failed:", error.message);
}

// GET — return the raw config (all sections + all fields) for the builder.
export async function GET() {
  const { user, error } = await requireAdmin();
  if (!user) return error!;
  const supabase = createServiceClient();
  const [{ data: sections }, { data: fields }] = await Promise.all([
    supabase.from("form_sections").select("*").order("step").order("sort_order"),
    supabase.from("form_fields").select("*").order("sort_order"),
  ]);
  return NextResponse.json({ sections: sections ?? [], fields: fields ?? [] });
}

const createSchema = z.object({
  type: z.enum(["section", "field"]),
  data: z.record(z.string(), z.unknown()),
});

// POST — create a section or field.
export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;
  const parsed = createSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const { type, data } = parsed.data;
  const supabase = createServiceClient();
  const table = type === "section" ? "form_sections" : "form_fields";
  const cols = type === "section" ? SECTION_COLS : FIELD_COLS;
  const row = pick(data, cols);

  const { data: created, error: insErr } = await supabase
    .from(table)
    .insert(row)
    .select("id")
    .single();
  if (insErr || !created) {
    return NextResponse.json({ error: insErr?.message ?? "Insert failed" }, { status: 500 });
  }
  await audit(supabase, user, `form.${type}.create`, created.id, { created: row });
  return NextResponse.json({ ok: true, id: created.id });
}

const patchSchema = z.object({
  type: z.enum(["section", "field"]),
  id: z.string().uuid(),
  updates: z.record(z.string(), z.unknown()),
});

// PATCH — update a section or field.
export async function PATCH(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;
  const parsed = patchSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const { type, id, updates } = parsed.data;
  const supabase = createServiceClient();
  const table = type === "section" ? "form_sections" : "form_fields";
  const cols = type === "section" ? SECTION_COLS : FIELD_COLS;
  const sanitised = pick(updates, cols);
  if (Object.keys(sanitised).length === 0) {
    return NextResponse.json({ error: "No editable fields in payload" }, { status: 400 });
  }
  sanitised.updated_at = new Date().toISOString();

  const { error: updErr } = await supabase.from(table).update(sanitised).eq("id", id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await audit(supabase, user, `form.${type}.update`, id, { updates: sanitised });
  return NextResponse.json({ ok: true, id });
}

const deleteSchema = z.object({
  type: z.enum(["section", "field"]),
  id: z.string().uuid(),
});

// DELETE — remove a section (cascades its fields) or a single field.
export async function DELETE(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;
  const parsed = deleteSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const { type, id } = parsed.data;
  const supabase = createServiceClient();
  const table = type === "section" ? "form_sections" : "form_fields";

  // Warn when deleting a column-mapped field — it stops feeding vetting/directory.
  let warning: string | undefined;
  if (type === "field") {
    const { data: f } = await supabase
      .from("form_fields")
      .select("column_map")
      .eq("id", id)
      .maybeSingle();
    if (f?.column_map) {
      warning = `Field was mapped to submissions.${f.column_map}; new submissions will no longer populate it.`;
    }
  }

  const { error: delErr } = await supabase.from(table).delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  await audit(supabase, user, `form.${type}.delete`, id, { warning });
  return NextResponse.json({ ok: true, id, warning });
}

async function safeJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
