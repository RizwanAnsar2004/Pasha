/**
 * Create a Supabase Auth user for an allowlisted admin (email_confirm=true).
 * Returns true when a new user was created; false when one already exists.
 */
export async function provisionSupabaseAuthUser(
  email: string,
  password: string
): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      app_metadata: { role: "admin" },
    }),
  });

  if (res.ok) return true;

  const body = await res.text();
  // Supabase returns 422 when the email is already registered.
  if (res.status === 422 || /already|exists|registered/i.test(body)) {
    return false;
  }

  console.error("provisionSupabaseAuthUser failed:", res.status, body);
  return false;
}

/** Set password on an existing Supabase Auth user (by email). */
export async function setSupabaseAuthPassword(
  email: string,
  password: string
): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const normalized = email.toLowerCase();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("listUsers failed:", error.message);
      return false;
    }
    const match = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (match) {
      const { error: updErr } = await admin.auth.admin.updateUserById(match.id, {
        password,
        email_confirm: true,
      });
      if (updErr) {
        console.error("updateUserById failed:", updErr.message);
        return false;
      }
      return true;
    }
    if (data.users.length < perPage) break;
    page += 1;
  }

  return false;
}
