import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { clearAdminSessionCookie } from "@/lib/auth/admin/admin-session";
import { SITE_URL } from "@/lib/utils/site-url";

// Applicant email-verification callback. Supabase sends the signup confirmation
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  // Recovery (password reset) links pass an explicit redirect; email-signup verification doesn't, so it lands on the dedicated "Email verified" page.
  const redirect = url.searchParams.get("redirect") ?? "/apply/verified";
  // Supabase can bounce here with an error (e.g.
  const linkError =
    url.searchParams.get("error") ?? url.searchParams.get("error_code");

  // A recovery link that fails is almost never "expired" in the literal sense —
  // PKCE binds it to the browser that asked, so a phone or second profile fails
  // on the first click. Send those users straight to "request a new link"
  // instead of a dead-end page.
  const isRecovery = type === "recovery" || redirect.includes("reset-password");
  const isAdminRecovery = redirect.startsWith("/admin");
  const failurePath = isRecovery
    ? isAdminRecovery
      ? "/admin/login?error=link_expired"
      : "/apply/login?forgot=1&error=link_expired"
    : "/apply/verified?error=1";

  // Behind a reverse proxy request.url carries the internal host:port, which
  // would send the browser to the origin server instead of the public domain.
  const verifiedUrl = (failed: boolean) => new URL(failed ? failurePath : redirect, SITE_URL);

  // Default to the success destination; downgrade to the error page if the exchange/verify fails below.
  const response = NextResponse.redirect(verifiedUrl(Boolean(linkError)));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let failed = Boolean(linkError);
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "signup" | "magiclink" | "recovery" | "invite" | "email",
      token_hash,
    });
    failed = Boolean(error);
  }

  if (failed) {
    return NextResponse.redirect(verifiedUrl(true));
  }

  response.cookies.set(clearAdminSessionCookie());
  return response;
}
