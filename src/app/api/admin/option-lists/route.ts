import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin/admin-allowlist";
import { getAdminOptionTypes, saveOptionType, deleteOptionType } from "@/lib/options/admin.server";
import { CACHE_NS, withCache, withInvalidate } from "@/lib/cache/index.server";

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

const itemSchema = z.object({ value: z.string().trim().min(1), label: z.string().trim().min(1) });

const upsertSchema = z.object({
  name: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_]+$/, "Use letters, numbers and underscores only"),
  label: z.string().trim().max(120).optional(),
  items: z.array(itemSchema),
});

// GET — every option list, sourced from the options/countries tables.
async function getHandler() {
  const { user, error } = await requireAdmin();
  if (!user) return error!;
  return NextResponse.json({ lists: await getAdminOptionTypes() });
}

// POST / PATCH — upsert a whole list into the options table, then re-link data rows.
async function upsert(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;
  const parsed = upsertSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
  }
  try {
    await saveOptionType(parsed.data.name, parsed.data.items);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Save failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export const POST = upsert;
export const PATCH = upsert;

// DELETE — deactivate every option in a list (existing rows keep resolving their label).
async function deleteHandler(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;
  const body = (await safeJson(req)) as { name?: string };
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Missing list name" }, { status: 400 });
  try {
    await deleteOptionType(name);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Delete failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

async function safeJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

// --- Redis cache wiring: read-through on GET, namespace invalidation on writes. ---
export const GET = withCache(CACHE_NS.optionLists, getHandler, { guard: requireAdmin });
export const DELETE = withInvalidate(CACHE_NS.optionLists, deleteHandler);
