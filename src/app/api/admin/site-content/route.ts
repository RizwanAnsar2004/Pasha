import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createClient as createSessionClient,
  createServiceClient,
} from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin/admin-allowlist";
import {
  DEFAULT_SITE_CONTENT,
  SITE_CONTENT_SLUGS,
  isSiteContentSlug,
  type SiteContentSlug,
} from "@/lib/content/site-content";

const putSchema = z.object({
  slug: z.enum(SITE_CONTENT_SLUGS),
  title: z.string().trim().max(200).default(""),
  body: z.string().max(200000).default(""),
});

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

// GET /api/admin/site-content?slug=privacy_policy → current content (or default).
export async function GET(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const slugParam = new URL(req.url).searchParams.get("slug") ?? "";
  if (!isSiteContentSlug(slugParam)) {
    return NextResponse.json({ error: "Unknown slug" }, { status: 400 });
  }
  const slug = slugParam as SiteContentSlug;
  const fallback = DEFAULT_SITE_CONTENT[slug];

  const supabase = createServiceClient();
  const { data, error: dbErr } = await supabase
    .from("site_content")
    .select("slug, title, body, updated_at")
    .eq("slug", slug)
    .maybeSingle();

  if (dbErr || !data) {
    return NextResponse.json({ slug, ...fallback, updated_at: null });
  }
  return NextResponse.json({
    slug,
    title: data.title || fallback.title,
    body: data.body || fallback.body,
    updated_at: data.updated_at ?? null,
  });
}

// PUT /api/admin/site-content → upsert the content block.
export async function PUT(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const parsed = putSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { slug, title, body } = parsed.data;

  const supabase = createServiceClient();
  const { data, error: dbErr } = await supabase
    .from("site_content")
    .upsert(
      { slug, title, body, updated_at: new Date().toISOString(), updated_by: user.email ?? null },
      { onConflict: "slug" }
    )
    .select("slug, title, body, updated_at")
    .single();

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
