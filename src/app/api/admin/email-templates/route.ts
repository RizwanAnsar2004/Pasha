import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSessionClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin/admin-allowlist";
import { parsePagination } from "@/lib/utils/pagination";
import { EMAIL_TEMPLATE_COLS } from "@/lib/email/email-templates";
import { CACHE_NS, withCache, withInvalidate } from "@/lib/cache/index.server";

// placeholders: object mapping token -> sample value, e.g.
const placeholdersSchema = z.record(z.string(), z.string().max(500)).default({});

const templateFieldsSchema = z.object({
  template_id: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only"),
  name: z.string().trim().max(120).default(""),
  subject: z.string().trim().max(300).default(""),
  body: z.string().max(100000).default(""),
  placeholders: placeholdersSchema,
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  is_default: z.boolean().default(false),
  description: z.string().trim().max(1000).default(""),
});

const createSchema = templateFieldsSchema;
const patchSchema = templateFieldsSchema.extend({ id: z.string().uuid() });
const deleteSchema = z.object({ id: z.string().uuid() });

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

  const { page, pageSize, from, to } = parsePagination(new URL(req.url));
  const supabase = createServiceClient();
  const { data, count, error: dbErr } = await supabase
    .from("email_templates")
    .select(EMAIL_TEMPLATE_COLS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (dbErr) {
    if (/email_templates|does not exist/i.test(dbErr.message)) {
      return NextResponse.json({ templates: [], total: 0, page, pageSize });
    }
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ templates: data ?? [], total: count ?? 0, page, pageSize });
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
    .from("email_templates")
    .insert({ ...parsed.data, author_email: user.email })
    .select(EMAIL_TEMPLATE_COLS)
    .single();

  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json({ error: "A template with that Template ID already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ template: data });
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
    .from("email_templates")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(EMAIL_TEMPLATE_COLS)
    .single();

  if (updErr) {
    if (updErr.code === "23505") {
      return NextResponse.json({ error: "A template with that Template ID already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ template: data });
}

async function deleteHandler(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const parsed = deleteSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Default templates are protected and cannot be deleted.
  const { data: existing } = await supabase
    .from("email_templates")
    .select("is_default")
    .eq("id", parsed.data.id)
    .single();
  if (existing?.is_default) {
    return NextResponse.json({ error: "Default templates cannot be deleted." }, { status: 403 });
  }

  const { error: delErr } = await supabase.from("email_templates").delete().eq("id", parsed.data.id);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// --- Redis cache wiring: read-through on GET, namespace invalidation on writes. ---
export const GET = withCache(CACHE_NS.emailTemplates, getHandler, { guard: requireAdmin });
export const POST = withInvalidate(CACHE_NS.emailTemplates, postHandler);
export const PATCH = withInvalidate(CACHE_NS.emailTemplates, patchHandler);
export const DELETE = withInvalidate(CACHE_NS.emailTemplates, deleteHandler);
