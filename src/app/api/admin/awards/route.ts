import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createClient as createSessionClient,
  createServiceClient,
} from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-allowlist";
import { getAwardsForAdmin } from "@/lib/awards.server";
import { parsePagination } from "@/lib/pagination";

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
// GET (list) → { awards, total, page, pageSize } with server-side search
//   (listQ), source filter, and pagination.
export async function GET(req: Request) {
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
export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const parsed = addSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { databank_id, title, year } = parsed.data;

  const supabase = createServiceClient();
  const { data: startup } = await supabase
    .from("databank")
    .select("id")
    .eq("id", databank_id)
    .maybeSingle();
  if (!startup) {
    return NextResponse.json({ error: "Startup not found" }, { status: 404 });
  }

  const { data, error: dbErr } = await supabase
    .from("startup_awards")
    .insert({ databank_id, title, year })
    .select("id")
    .single();

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}

// PATCH → edit an existing award entry.
export async function PATCH(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const parsed = patchSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { id, databank_id, title, year } = parsed.data;

  const supabase = createServiceClient();
  const { error: dbErr } = await supabase
    .from("startup_awards")
    .update({ databank_id, title, year })
    .eq("id", id);

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE → remove an award entry.
export async function DELETE(req: Request) {
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
