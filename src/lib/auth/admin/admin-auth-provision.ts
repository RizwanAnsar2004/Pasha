// Create a Supabase Auth user for an allowlisted admin (email_confirm=true).
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

// Create a Supabase Auth user for a company-profile claimant (applicant role,
// email_confirm=true). Returns the new user id when created, or created=false
// when the email is already registered (we never overwrite an existing password).
export async function provisionApplicantAuthUser(
  email: string,
  password: string
): Promise<{ created: boolean; userId: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { created: false, userId: null };

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
      app_metadata: { role: "applicant" },
    }),
  });

  if (res.ok) {
    const body = (await res.json().catch(() => null)) as { id?: string } | null;
    return { created: true, userId: body?.id ?? null };
  }

  const body = await res.text();
  // Supabase returns 422 when the email is already registered.
  if (res.status === 422 || /already|exists|registered/i.test(body)) {
    return { created: false, userId: null };
  }

  console.error("provisionApplicantAuthUser failed:", res.status, body);
  return { created: false, userId: null };
}

// Reset an existing user's password (by email) and return their id, or null if
// not found. Used by the claim flow when the email already has an account — the
// OTP already proved the claimant controls the address.
export async function resetApplicantPassword(
  email: string,
  password: string
): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const normalized = email.toLowerCase();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("resetApplicantPassword listUsers failed:", error.message);
      return null;
    }
    const match = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (match) {
      const { error: updErr } = await admin.auth.admin.updateUserById(match.id, {
        password,
        email_confirm: true,
      });
      if (updErr) {
        console.error("resetApplicantPassword updateUserById failed:", updErr.message);
        return null;
      }
      return match.id;
    }
    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

// Delete a Supabase Auth user by email. Returns true when a user was found and
export async function deleteSupabaseAuthUser(email: string): Promise<boolean> {
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
      const { error: delErr } = await admin.auth.admin.deleteUser(match.id);
      if (delErr) {
        console.error("deleteUser failed:", delErr.message);
        return false;
      }
      return true;
    }
    if (data.users.length < perPage) break;
    page += 1;
  }

  return false;
}

// Set password on an existing Supabase Auth user (by email).
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
