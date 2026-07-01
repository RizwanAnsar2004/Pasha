import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { clearAdminSessionCookie } from "@/lib/admin-session";

// Routes inside /admin that don't require auth (otherwise we infinite-loop)
const ADMIN_PUBLIC = ["/admin/login", "/admin/callback", "/admin/logout"];

// /super-admin lives outside the Supabase-Auth admin allowlist — it has its
// own signed-cookie session. We let the page route handle its own redirect
// to /super-admin/login when the cookie is missing.
const SUPER_ADMIN_PUBLIC_PREFIXES = ["/super-admin", "/api/super-admin"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  // Don't gate /super-admin or its API — that flow uses its own cookie.
  if (SUPER_ADMIN_PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return response;
  }

  // Applicant portal: keep the Supabase session cookie healthy. The /apply
  // pages read the session during a Server Component render, where Next forbids
  // cookie writes — so a rotated/expired refresh token can never be refreshed
  // or cleared there and just keeps erroring (silently breaking client-side
  // navigation until a full reload). Middleware CAN write cookies, so here we
  // touch the session: Supabase refreshes it (writing fresh cookies) or, on
  // failure, we drop the dead cookie. We do NOT redirect — the portal layout
  // still owns auth gating.
  if (pathname === "/apply" || pathname.startsWith("/apply/")) {
    return refreshApplicantSession(request);
  }

  // Skip auth for admin public routes (login / callback / logout)
  const isAdminGated =
    pathname.startsWith("/admin") &&
    !ADMIN_PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!isAdminGated) return response;

  // ── DEV BYPASS ─────────────────────────────────────────────
  // When Supabase isn't actually configured (placeholder URL used for
  // local development), skip the auth check entirely so the admin
  // portal UI can still be browsed. In production this branch never
  // fires because the URL points at a real Supabase project.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (supabaseUrl.includes("placeholder") || supabaseUrl === "") {
    return response;
  }

  // ── TEMP REVIEW BYPASS (local dev only) ────────────────────
  // Lets the admin portal be browsed without signing in. Guarded by
  // NODE_ENV so it is impossible to trigger in a production build.
  // REMOVE before relying on real auth again.
  if (process.env.NODE_ENV !== "production") {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectToAdminLogin(request, { redirect: pathname });
  }

  // Admin allowlist check. The allowlist lives in the `admin_users` table
  // and is maintained via the /super-admin portal — we query it from the
  // middleware's edge runtime via PostgREST (the Supabase service-role
  // JWT is exposed as a server env var, NOT in the public bundle).
  //
  // We tolerate transient DB failures by NOT locking out the session in
  // that case — the request still passes through. The /api/admin/* routes
  // do the same check against the same source of truth, so a failure
  // here can't actually let a non-admin write anything.
  if (user.email) {
    const allowed = await isAllowedAdminEmail(user.email);
    if (!allowed) {
      return redirectToAdminLogin(request, {
        redirect: pathname,
        error: "unauthorized_email",
      });
    }
  }

  return response;
}

/**
 * Refresh (or clear) the applicant's Supabase session at the edge, where cookie
 * writes actually persist to the browser. On a valid session Supabase rotates
 * the token and `setAll` writes the fresh cookies onto the response; on a dead
 * refresh token `getUser()` errors and `signOut({ scope: "local" })` writes the
 * cleared cookies — the one place that removal sticks (a Server Component render
 * can't). Never redirects and never throws: the /apply layout still gates auth.
 */
async function refreshApplicantSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  // Nothing to maintain when Supabase isn't really configured (local-dev
  // placeholder URL) — mirrors the admin branch's dev guard.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (supabaseUrl.includes("placeholder") || supabaseUrl === "") return response;

  const supabase = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    const { error } = await supabase.auth.getUser();
    if (error) await supabase.auth.signOut({ scope: "local" });
  } catch {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Clearing is best-effort — never break the request over it.
    }
  }

  return response;
}

/**
 * Edge-runtime admin allowlist check. Hits PostgREST with the service-role
 * key. Cached in module memory for 30s — the edge runtime reuses the same
 * function instance for many requests so this saves a round-trip on every
 * admin page nav.
 */
const ADMIN_CACHE_TTL_MS = 30_000;
let adminCache: { at: number; set: Set<string> } | null = null;
async function isAllowedAdminEmail(email: string): Promise<boolean> {
  const lc = email.toLowerCase();
  if (adminCache && Date.now() - adminCache.at < ADMIN_CACHE_TTL_MS) {
    return adminCache.set.has(lc);
  }
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const res = await fetch(`${url}/rest/v1/admin_users?select=email`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) {
      // Don't lock anyone out on transient errors — fall back to a stale
      // cache or allow-by-default. The /api/admin/* server-side checks
      // are the real gate; this middleware is best-effort.
      return adminCache?.set.has(lc) ?? true;
    }
    const rows: { email: string }[] = await res.json();
    const set = new Set(rows.map((r) => r.email.toLowerCase()));
    adminCache = { at: Date.now(), set };
    return set.has(lc);
  } catch {
    return adminCache?.set.has(lc) ?? true;
  }
}

/** Redirect to admin login and clear a stale `psec_admin` cookie so the login
 *  page doesn't bounce back to a gated route (ERR_TOO_MANY_REDIRECTS). */
function redirectToAdminLogin(
  request: NextRequest,
  params: { redirect?: string; error?: string }
) {
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  if (params.redirect) url.searchParams.set("redirect", params.redirect);
  if (params.error) url.searchParams.set("error", params.error);
  const response = NextResponse.redirect(url);
  response.cookies.set(clearAdminSessionCookie());
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
