// Dynamic admin allowlist. Backed by the `admin_users` table in Postgres,

import { createServiceClient } from "@/lib/supabase/server";

const CACHE_TTL_MS = 30_000;

let cache: { at: number; set: Set<string> } | null = null;

async function fetchAllowed(): Promise<Set<string>> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("email");
  if (error) {
    console.error("admin_users fetch failed:", error.message);
    // Don't lock everyone out on a transient DB error — return the cached
    return cache?.set ?? new Set();
  }
  return new Set((data ?? []).map((r) => r.email.toLowerCase()));
}

export async function getAdminAllowlist(): Promise<Set<string>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.set;
  const set = await fetchAllowed();
  cache = { at: Date.now(), set };
  return set;
}

export function bustAdminAllowlistCache(): void {
  cache = null;
}

export async function isAdminEmail(
  email: string | null | undefined
): Promise<boolean> {
  if (!email) return false;
  const allow = await getAdminAllowlist();
  return allow.has(email.toLowerCase());
}
