import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  clearAdminSessionCookie,
  readAdminSession,
} from "@/lib/admin-session";
import { isAdminEmail } from "@/lib/admin-allowlist";
import { createClient } from "@/lib/supabase/server";
import { AdminLoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const params = await searchParams;

  // Middleware sent us here after rejecting the current Supabase session — never
  // bounce back to /admin based on a stale committee cookie.
  if (params.error === "unauthorized_email") {
    return <AdminLoginForm />;
  }

  const cookieEmail = await readAdminSession();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const supabaseEmail = user?.email?.toLowerCase() ?? null;

  const sessionMatches =
    cookieEmail &&
    supabaseEmail &&
    cookieEmail === supabaseEmail &&
    (await isAdminEmail(supabaseEmail));

  if (sessionMatches) {
    redirect(params.redirect ?? "/admin");
  }

  // Stale committee cookie (e.g. signed in as applicant after admin) — drop it.
  if (cookieEmail && !sessionMatches) {
    const jar = await cookies();
    jar.set(clearAdminSessionCookie());
  }

  return <AdminLoginForm />;
}
