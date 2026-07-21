import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { clearAdminSessionCookie } from "@/lib/auth/admin/admin-session";

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

  const verifiedUrl = (failed: boolean) =>
    new URL(failed ? "/apply/verified?error=1" : redirect, url.origin);

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
