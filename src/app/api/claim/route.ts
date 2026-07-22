import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { getApplicantContext } from "@/lib/auth/applicant/applicant-auth";
import { sendRawEmail } from "@/lib/email/mailer";
import { emailOrigin } from "@/lib/utils/site-url";
import { CACHE_NS, withInvalidate } from "@/lib/cache/index.server";
import { provisionApplicantAuthUser, resetApplicantPassword } from "@/lib/auth/admin/admin-auth-provision";
import { generatePassword } from "@/lib/committee/committee-invite";
import { sendClaimCredentials } from "@/lib/startups/claim/claim-invite";
import { seedClaimedApplication } from "@/lib/startups/claim/seed-application.server";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_WINDOW_MS = 60 * 1000;

const startSchema = z.object({ action: z.literal("start"), databankId: z.string().uuid(), email: z.string().trim().email() });
const verifySchema = z.object({
  action: z.literal("verify"),
  databankId: z.string().uuid(),
  email: z.string().trim().email(),
  code: z.string().trim().regex(/^\d{6}$/),
});

function clientIp(req: NextRequest): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;
}

// Returns an error message when this email already owns a company on the Hub —
// either it has claimed another profile, or it created its own via an
// application — otherwise null. Excludes the profile currently being claimed.
async function ownershipConflict(
  supabase: ReturnType<typeof createServiceClient>,
  email: string,
  currentId: string
): Promise<string | null> {
  const { data: claimed } = await supabase
    .from("databank")
    .select("id")
    .eq("claimed_email", email)
    .eq("verified_claimed", true)
    .neq("id", currentId)
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (claimed) return "This email already manages another company on the P@SHA Startup Hub.";

  const { data: sub } = await supabase
    .from("submissions")
    .select("id")
    .ilike("founder_email", email)
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (sub) {
    return "This email already has a startup application. Sign in to manage it, or claim with a different company email.";
  }

  return null;
}

// Reduce a hostname to a comparable registrable-ish domain (drop a leading
// "www." and lowercase). Not a full public-suffix parse, but enough to match a
// company email against its own website.
function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, "").trim();
}

// Extract a comparable host from a website URL or a bare domain string, or null
// when it's empty/unparseable.
function hostFrom(value: string | null): string | null {
  const v = (value ?? "").trim();
  // Imported rows sometimes store the literal string "NULL" / "—" as a website.
  if (!v || v.toUpperCase() === "NULL" || v === "—") return null;
  try {
    return normalizeHost(new URL(v.includes("://") ? v : `https://${v}`).hostname) || null;
  } catch {
    return null;
  }
}

// Whether the email belongs to the company's website domain. Returns null when
// the profile has no website to compare against (nothing to enforce, so the
// caller should allow the claim); true/false otherwise. Matches when the domains
// are equal or one is a subdomain of the other (e.g. mail.acme.com vs acme.com).
function emailMatchesWebsite(email: string, website: string | null): boolean | null {
  const siteHost = hostFrom(website);
  if (!siteHost) return null;

  const emailDomain = normalizeHost(email.split("@")[1] ?? "");
  if (!emailDomain) return false;

  return (
    emailDomain === siteHost ||
    emailDomain.endsWith(`.${siteHost}`) ||
    siteHost.endsWith(`.${emailDomain}`)
  );
}

// Loads a claimable profile, or null when it doesn't exist or is already claimed.
async function loadProfile(supabase: ReturnType<typeof createServiceClient>, id: string) {
  const { data } = await supabase
    .from("databank")
    .select("id, startup_name, verified_claimed, claimed_email, website")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      startup_name: string;
      verified_claimed: boolean;
      claimed_email: string | null;
      website: string | null;
    }>();
  return data ?? null;
}

async function postHandler(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const supabase = createServiceClient();

  if (body?.action === "start") {
    const parsed = startSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    const { databankId, email } = parsed.data;
    const addr = email.toLowerCase();

    const profile = await loadProfile(supabase, databankId);
    if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    if (profile.verified_claimed) {
      return NextResponse.json({ error: "already_claimed", claimed: true }, { status: 409 });
    }

    // The email must belong to the company's website domain (when known).
    if (emailMatchesWebsite(addr, profile.website) === false) {
      return NextResponse.json(
        {
          error:
            "Please use an email on the company's website domain. If you don't have one, contact startups@pasha.org.pk.",
        },
        { status: 422 }
      );
    }

    // Block emails that already own a company (claimed elsewhere or self-created).
    const conflict = await ownershipConflict(supabase, addr, databankId);
    if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });

    // Rate limit: one code per email+profile per minute.
    const { data: recent } = await supabase
      .from("company_claims")
      .select("created_at")
      .eq("databank_id", databankId)
      .eq("email", addr)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ created_at: string }>();
    if (recent && Date.now() - new Date(recent.created_at).getTime() < RESEND_WINDOW_MS) {
      return NextResponse.json({ error: "Please wait a minute before requesting another code." }, { status: 429 });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const { error: insErr } = await supabase.from("company_claims").insert({
      databank_id: databankId,
      email: addr,
      code,
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
      ip: clientIp(req),
    });
    if (insErr) return NextResponse.json({ error: "Could not start the claim. Please try again." }, { status: 500 });

    const sent = await sendRawEmail({
      to: { email: addr },
      subject: `Your code to claim ${profile.startup_name}`,
      html: claimEmailHtml(profile.startup_name, code),
    });
    if (!sent.ok) {
      // The code row is left in place (harmless — it expires), but tell the
      // user the email didn't go out instead of silently advancing the UI.
      console.error("[claim] failed to send code email:", sent.error);
      return NextResponse.json(
        { error: "We couldn't send the verification code. Please try again shortly." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  }

  if (body?.action === "verify") {
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
    const { databankId, email, code } = parsed.data;
    const addr = email.toLowerCase();

    const profile = await loadProfile(supabase, databankId);
    if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    if (profile.verified_claimed) return NextResponse.json({ error: "already_claimed", claimed: true }, { status: 409 });

    const { data: claim } = await supabase
      .from("company_claims")
      .select("id, code, expires_at, attempts, consumed_at")
      .eq("databank_id", databankId)
      .eq("email", addr)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; code: string; expires_at: string; attempts: number; consumed_at: string | null }>();

    if (!claim) return NextResponse.json({ error: "Request a code first." }, { status: 400 });
    if (new Date(claim.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "That code expired. Request a new one." }, { status: 400 });
    }
    if (claim.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 429 });
    }
    if (claim.code !== code) {
      await supabase.from("company_claims").update({ attempts: claim.attempts + 1 }).eq("id", claim.id);
      return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 400 });
    }

    const ctx = await getApplicantContext();
    const now = new Date().toISOString();

    // Ownership is proven by the OTP on `addr`, so the owner account must be the
    // one for `addr` — NOT whoever happens to be signed in. Only when the signed-in
    // applicant IS this email do we reuse their session account (and keep their
    // existing password). Otherwise provision or reset the account for `addr` and
    // email fresh credentials, so the claimant always gets a way to sign in.
    const sessionEmail = ctx.status === "applicant" ? ctx.user.email?.toLowerCase() ?? null : null;
    let ownerId: string | null = sessionEmail === addr ? ctx.user!.id : null;
    let newPassword: string | null = null;
    if (!ownerId) {
      const password = generatePassword();
      const prov = await provisionApplicantAuthUser(addr, password);
      if (prov.created) {
        ownerId = prov.userId;
        newPassword = password;
      } else {
        // Account already exists (e.g. a re-claim). The OTP just proved the
        // claimant controls this email, so reset the password and email fresh
        // credentials rather than leaving them without a way in.
        const resetId = await resetApplicantPassword(addr, password);
        if (resetId) {
          ownerId = resetId;
          newPassword = password;
        } else {
          console.error("[claim] could not provision or reset account for", addr);
        }
      }
    }

    await supabase.from("company_claims").update({ consumed_at: now }).eq("id", claim.id);
    // The verified email becomes the profile's owner + company contact email.
    const { error: updErr } = await supabase
      .from("databank")
      .update({
        verified_claimed: true,
        claimed_email: addr,
        claimed_by: ownerId,
        claimed_at: now,
        contact_email: addr,
      })
      .eq("id", databankId)
      .eq("verified_claimed", false);
    if (updErr) return NextResponse.json({ error: "Could not complete the claim." }, { status: 500 });

    // Populate the claimant's portal with this startup (fields filled + marked
    // submitted) so they don't land on a blank application after signing in.
    await seedClaimedApplication({ ownerId, email: addr, databankId });

    await supabase.from("audit_log").insert({
      actor_id: ownerId,
      actor_email: addr,
      action: "company.claim",
      resource_type: "databank",
      resource_id: databankId,
      payload: { email: addr, ip: clientIp(req), at: now },
    });

    // Always confirm a successful claim by email. Include the generated/reset
    // password when we made one; otherwise it's a confirmation pointing the
    // already-signed-in owner at the portal (their existing password stands).
    if (ownerId) {
      const sent = await sendClaimCredentials({
        email: addr,
        company: profile.startup_name,
        password: newPassword,
        createdBy: ownerId,
        origin: emailOrigin(),
      });
      if (!sent.ok) console.error("[claim] failed to send credentials email:", sent.error);
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// Plain verification-code email body.
function claimEmailHtml(company: string, code: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <p>Use this code to claim <strong>${company}</strong> on the P@SHA Startup Hub:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:20px 0">${code}</p>
      <p style="color:#666;font-size:14px">This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
      <p style="color:#666;font-size:13px;margin-top:24px">${emailOrigin()}</p>
    </div>`;
}

// --- Redis cache wiring: read-through on GET, namespace invalidation on writes. ---
export const POST = withInvalidate(CACHE_NS.databank, postHandler);
