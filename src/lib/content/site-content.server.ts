import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import {
  DEFAULT_SITE_CONTENT,
  type SiteContentSlug,
} from "@/lib/content/site-content";

// Reads an admin-editable content block by slug. Falls back to the built-in
export async function getSiteContent(
  slug: SiteContentSlug
): Promise<{ title: string; body: string; updated_at: string | null }> {
  const fallback = DEFAULT_SITE_CONTENT[slug];
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("site_content")
      .select("title, body, updated_at")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data || !data.body) {
      return { ...fallback, updated_at: null };
    }
    return {
      title: data.title || fallback.title,
      body: data.body,
      updated_at: (data.updated_at as string) ?? null,
    };
  } catch {
    return { ...fallback, updated_at: null };
  }
}
