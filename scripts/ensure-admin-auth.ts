/**
 * One-time: create the Supabase Auth user for ADMIN_EMAIL (must be in admin_users).
 *
 *   pnpm tsx scripts/ensure-admin-auth.ts
 */
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { provisionSupabaseAuthUser, setSupabaseAuthPassword } from "../src/lib/admin-auth-provision";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const email = process.env.ADMIN_EMAIL?.toLowerCase();
const password = process.env.ADMIN_PASSWORD_HASH; // dev stores plaintext in this var

if (!email || !password) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD_HASH in .env.local");
  process.exit(1);
}

const adminEmail: string = email;
const adminPassword: string = password;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { data: row } = await supabase
    .from("admin_users")
    .select("email")
    .eq("email", adminEmail)
    .maybeSingle();

  if (!row) {
    console.error(`${adminEmail} is not in admin_users — add it in Supabase first.`);
    process.exit(1);
  }

  const created = await provisionSupabaseAuthUser(adminEmail, adminPassword);
  if (created) {
    console.log(`Created Supabase Auth user for ${adminEmail}`);
  } else {
    const updated = await setSupabaseAuthPassword(adminEmail, adminPassword);
    console.log(
      updated
        ? `Updated password for existing Supabase Auth user ${adminEmail}`
        : `Auth user for ${adminEmail} already exists (could not update password)`
    );
  }

  console.log("Sign in at /admin/login with that email and password.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
