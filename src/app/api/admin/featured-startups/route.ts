import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSessionClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-allowlist";
import { getFeaturedSettings, getFeaturedForAdmin, getFeaturedStatusByDatabankId } from "@/lib/featured-startups.server";

const DATABANK_SELECT =
  "id,startup_name,tagline,primary_industry,city,logo_url,current_revenue,total_employees,female_employees,number_of_customers,pasha_verified,product_stage,incubation_stage";

const addSchema = z.object({
  databank_id: z.string().uuid(),
  featured_from: z.string().datetime().optional(),
  featured_until: z.string().datetime(),
});

const patchEntrySchema = z.object({
  id: z.string().uuid(),
  featured_from: z.string().datetime().optional(),
  featured_until: z.string().datetime().optional(),
  databank_id: z.string().uuid().optional(),
});

const patchSettingsSchema = z.object({
  auto_rotate: z.boolean().optional(),
  show_on_homepage: z.boolean().optional(),
  show_on_directory: z.boolean().optional(),
  show_in_search: z.boolean().optional(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
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

export async function GET(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const url = new URL(req.url);
  const databankId = url.searchParams.get("databank_id")?.trim();
  if (databankId) {
    const featured = await getFeaturedStatusByDatabankId(databankId);
    return NextResponse.json({ featured });
  }

  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const supabase = createServiceClient();

  const [featured, settings] = await Promise.all([
    getFeaturedForAdmin(),
    getFeaturedSettings(),
  ]);

  let candidates: Record<string, unknown>[] = [];
  if (q.length >= 1) {
    const { data } = await supabase
      .from("databank")
      .select("id,startup_name,primary_industry,city,product_stage,pasha_verified")
      .ilike("startup_name", `%${q}%`)
      .order("startup_name", { ascending: true })
      .limit(20);
    candidates = (data ?? []) as Record<string, unknown>[];
  }

  return NextResponse.json({ featured, settings, candidates });
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

  const { databank_id, featured_until } = parsed.data;
  const featured_from = parsed.data.featured_from ?? new Date().toISOString();

  if (new Date(featured_until) <= new Date(featured_from)) {
    return NextResponse.json(
      { error: "End date must be after the start date" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: startup } = await supabase
    .from("databank")
    .select("id")
    .eq("id", databank_id)
    .maybeSingle();
  if (!startup) {
    return NextResponse.json({ error: "Startup not found in databank" }, { status: 404 });
  }

  const { data, error: insErr } = await supabase
    .from("featured_startups")
    .insert({ databank_id, featured_from, featured_until })
    .select(`id,featured_from,featured_until,created_at,databank:databank_id (${DATABANK_SELECT})`)
    .single();

  if (insErr) {
    const conflict = /duplicate|unique|databank_id/i.test(insErr.message);
    return NextResponse.json(
      { error: conflict ? "This startup is already featured" : insErr.message },
      { status: conflict ? 409 : 500 }
    );
  }

  return NextResponse.json({ entry: data });
}

export async function PATCH(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const body = await safeJson(req);
  const entryParsed = patchEntrySchema.safeParse(body);
  if (entryParsed.success) {
    const { id, ...fields } = entryParsed.data;
    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error: updErr } = await supabase
      .from("featured_startups")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(`id,featured_from,featured_until,created_at,databank:databank_id (${DATABANK_SELECT})`)
      .single();

    if (updErr) {
      const conflict = /duplicate|unique|databank_id/i.test(updErr.message);
      return NextResponse.json(
        { error: conflict ? "This startup is already featured" : updErr.message },
        { status: conflict ? 409 : 500 }
      );
    }
    return NextResponse.json({ entry: data });
  }

  const settingsParsed = patchSettingsSchema.safeParse(body);
  if (!settingsParsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error: updErr } = await supabase
    .from("featured_startup_settings")
    .update({ ...settingsParsed.data, updated_at: new Date().toISOString() })
    .eq("id", true)
    .select("auto_rotate,show_on_homepage,show_on_directory,show_in_search")
    .single();

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }
  return NextResponse.json({ settings: data });
}

export async function DELETE(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const parsed = deleteSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error: delErr } = await supabase
    .from("featured_startups")
    .delete()
    .eq("id", parsed.data.id);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
