import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createClient as createSessionClient,
  createServiceClient,
} from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin/admin-allowlist";
import { getAwardsForAdmin } from "@/lib/startups/awards/awards.server";
import { parsePagination } from "@/lib/utils/pagination";
import { CACHE_NS, withCache, withInvalidate } from "@/lib/cache/index.server";

const addSchema = z.object({
  databank_id: z.string().uuid(),
  title: z.string().trim().min(1, "Award title is required").max(200),
  year: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "" || v === null) return null;
      const n = typeof v === "number" ? v : Number.parseInt(v, 10);
      return Number.isFinite(n) ? n : null;
    })
    .pipe(
      z
        .number()
        .int("Enter a valid year")
        .min(1900, "Enter a valid year (1900–2100)")
        .max(2100, "Enter a valid year (1900–2100)")
        .nullable()
    ),
  description: z
    .string()
    .trim()
    .max(300, "Description is too long (max 300 characters)")
    .nullish()
    .transform((v) => (v && v.length ? v : null)),
});

const patchSchema = addSchema.extend({ id: z.string().uuid() });

const deleteSchema = z.object({ id: z.string().uuid() });

async function requireAdmin() {
  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user || !(await isAdminEmail(user.email))) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user, error: null as null };
}

async function safeJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

// GET ?q= → { candidates } startup search (modal picker).
async function getHandler(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (q.length >= 1) {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("databank")
      .select("id,startup_name,primary_industry,city,pasha_verified")
      .ilike("startup_name", `%${q}%`)
      .order("startup_name", { ascending: true })
      .limit(20);
    return NextResponse.json({ candidates: data ?? [] });
  }

  const listQ = url.searchParams.get("listQ")?.trim() ?? "";
  const source = url.searchParams.get("source")?.trim() ?? "all";
  const { page, pageSize, from, to } = parsePagination(url);
  const { rows, total } = await getAwardsForAdmin({ from, to }, { q: listQ, source });
  return NextResponse.json({ awards: rows, total, page, pageSize });
}

// POST → add an award to a startup.
async function postHandler(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const parsed = addSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { databank_id, title, year, description } = parsed.data;

  const supabase = createServiceClient();
  const { data: startup } = await supabase
    .from("databank")
    .select("id")
    .eq("id", databank_id)
    .maybeSingle();
  if (!startup) {
    return NextResponse.json({ error: "Startup not found" }, { status: 404 });
  }

  // Strip-and-retry so an award can still be added before the `description` column has been migrated in (the description is simply dropped in that case).
  const insertRow: Record<string, unknown> = { databank_id, title, year, description };
  let { data, error: dbErr } = await supabase
    .from("startup_awards")
    .insert(insertRow)
    .select("id")
    .single();
  if (dbErr && /description/i.test(dbErr.message)) {
    delete insertRow.description;
    ({ data, error: dbErr } = await supabase
      .from("startup_awards")
      .insert(insertRow)
      .select("id")
      .single());
  }

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }
  return NextResponse.json({ id: data?.id });
}

// PATCH → edit an existing award entry.
async function patchHandler(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const parsed = patchSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { id, databank_id, title, year, description } = parsed.data;

  const supabase = createServiceClient();
  const updateRow: Record<string, unknown> = { databank_id, title, year, description };
  let { error: dbErr } = await supabase
    .from("startup_awards")
    .update(updateRow)
    .eq("id", id);
  if (dbErr && /description/i.test(dbErr.message)) {
    delete updateRow.description;
    ({ error: dbErr } = await supabase.from("startup_awards").update(updateRow).eq("id", id));
  }

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE → remove an award entry.
async function deleteHandler(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const parsed = deleteSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error: dbErr } = await supabase
    .from("startup_awards")
    .delete()
    .eq("id", parsed.data.id);

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// --- Redis cache wiring: read-through on GET, namespace invalidation on writes. ---
export const GET = withCache(CACHE_NS.awards, getHandler, { guard: requireAdmin });
export const POST = withInvalidate(CACHE_NS.awards, postHandler);
export const PATCH = withInvalidate(CACHE_NS.awards, patchHandler);
export const DELETE = withInvalidate(CACHE_NS.awards, deleteHandler);
