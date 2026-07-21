import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSessionClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin/admin-allowlist";
import { sendTemplate, type MailRecipient } from "@/lib/email/mailer";

// Recipient scopes for a manual broadcast.
const schema = z.object({
  templateId: z.string().trim().min(1),
  scope: z.enum(["custom", "applicants", "approved", "databank", "all_profiles"]),
  emails: z.array(z.string().email()).max(5000).optional(),
  userIds: z.array(z.string().uuid()).max(5000).optional(),
});

async function requireAdmin() {
  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user || !(await isAdminEmail(user.email))) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user, error: null };
}

export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }
  const { templateId, scope, emails, userIds } = parsed.data;
  const supabase = createServiceClient();

  // Resolve recipients for the chosen scope.
  const recipients: MailRecipient[] = [];
  if (scope === "custom") {
    for (const e of emails ?? []) recipients.push({ email: e });
    if (userIds && userIds.length > 0) {
      const { data } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
      for (const p of data ?? []) if (p.email) recipients.push({ email: p.email, userId: p.id });
    }
  } else if (scope === "applicants") {
    const { data } = await supabase
      .from("submissions")
      .select("user_id, founder_email")
      .not("founder_email", "is", null)
      .limit(10000);
    for (const s of data ?? []) if (s.founder_email) recipients.push({ email: s.founder_email, userId: s.user_id });
  } else if (scope === "approved") {
    const { data } = await supabase
      .from("submissions")
      .select("user_id, founder_email")
      .eq("status", "approved")
      .not("founder_email", "is", null)
      .limit(10000);
    for (const s of data ?? []) if (s.founder_email) recipients.push({ email: s.founder_email, userId: s.user_id });
  } else if (scope === "databank") {
    const { data } = await supabase
      .from("databank")
      .select("contact_email")
      .not("contact_email", "is", null)
      .limit(10000);
    for (const d of data ?? []) if (d.contact_email) recipients.push({ email: d.contact_email });
  } else if (scope === "all_profiles") {
    const { data } = await supabase
      .from("profiles")
      .select("id, email")
      .not("email", "is", null)
      .limit(10000);
    for (const p of data ?? []) if (p.email) recipients.push({ email: p.email, userId: p.id });
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients found for that scope." }, { status: 400 });
  }

  const result = await sendTemplate({
    templateId,
    recipients,
    kind: "broadcast",
    createdBy: user.email,
    context: { trigger: "broadcast", scope },
  });

  if (!result.ok) {
    const unavailable = result.error === "mailer_unavailable" || result.error === "mailer_not_configured";
    const friendly = unavailable
      ? "Mailing service is not available at the moment. Please try again later."
      : result.error === "template_inactive"
        ? "That template is not active."
        : result.error === "template_not_found"
          ? "Template not found."
          : "Could not send the email.";
    return NextResponse.json({ error: friendly }, { status: unavailable ? 503 : 400 });
  }

  return NextResponse.json({ ok: true, sendId: result.sendId, queued: recipients.length });
}
