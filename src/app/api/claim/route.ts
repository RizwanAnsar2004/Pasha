import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { getApplicantContext } from "@/lib/auth/applicant/applicant-auth";
import { sendRawEmail } from "@/lib/email/mailer";
import { emailOrigin } from "@/lib/utils/site-url";

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

// Loads a claimable profile, or null when it doesn't exist or is already claimed.
async function loadProfile(supabase: ReturnType<typeof createServiceClient>, id: string) {
  const { data } = await supabase
    .from("databank")
    .select("id, startup_name, verified_claimed, claimed_email")
    .eq("id", id)
    .maybeSingle<{ id: string; startup_name: string; verified_claimed: boolean; claimed_email: string | null }>();
  return data ?? null;
}

export async function POST(req: NextRequest) {
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

    await sendRawEmail({
      to: { email: addr },
      subject: `Your code to claim ${profile.startup_name}`,
      html: claimEmailHtml(profile.startup_name, code),
    });

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
    const ownerId = ctx.status === "applicant" ? ctx.user.id : null;
    const now = new Date().toISOString();

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

    await supabase.from("audit_log").insert({
      actor_id: ownerId,
      actor_email: addr,
      action: "company.claim",
      resource_type: "databank",
      resource_id: databankId,
      payload: { email: addr, ip: clientIp(req), at: now },
    });

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
