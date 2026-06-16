export type AuthRealm = "admin" | "applicant" | "super-admin";

const REALM_CONFIG: Record<
  AuthRealm,
  { logoutUrl: string; loginPath: string }
> = {
  admin: { logoutUrl: "/api/admin/auth", loginPath: "/admin/login" },
  applicant: { logoutUrl: "/api/applicant/auth", loginPath: "/apply/login" },
  "super-admin": {
    logoutUrl: "/api/super-admin/auth",
    loginPath: "/super-admin/login",
  },
};

const AUTH_ROUTE = /\/api\/(admin|applicant|super-admin)\/auth\/?$/;

export function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

export function requestMethod(
  init?: RequestInit,
  input?: RequestInfo | URL
): string {
  if (init?.method) return init.method.toUpperCase();
  if (input instanceof Request) return input.method.toUpperCase();
  return "GET";
}

/** Whether a 401 should tear down the session and send the user to sign-in again. */
export function shouldLogoutOn401(url: string, method: string): boolean {
  if (!url.includes("/api/")) return false;
  // Wrong password on the login form — not an expired session.
  if (method === "POST" && AUTH_ROUTE.test(url)) return false;
  // Explicit sign-out.
  if (method === "DELETE" && AUTH_ROUTE.test(url)) return false;
  return true;
}

export async function logoutOnUnauthorized(realm: AuthRealm): Promise<void> {
  const { logoutUrl, loginPath } = REALM_CONFIG[realm];
  try {
    await fetch(logoutUrl, { method: "DELETE" });
  } catch {
    // Best-effort — still redirect so the user can sign in again.
  }

  const path = window.location.pathname;
  const search = window.location.search;
  const here = `${path}${search}`;
  const redirect =
    path !== loginPath && !path.startsWith(`${loginPath}/`)
      ? `?redirect=${encodeURIComponent(here)}`
      : "";
  window.location.replace(`${loginPath}${redirect}`);
}
