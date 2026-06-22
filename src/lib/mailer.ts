// Server-only email sender.
//
// Flow: fetch an ACTIVE template from Supabase → render subject/body per
// recipient → record one email_sends row + one email_recipients row each
// (status=queued) → hand the pre-rendered payload to the .NET Hangfire mailer,
// which sends via Gmail SMTP and flips each recipient row to sent/failed.
//
// Best-effort: any failure is logged and swallowed so it never breaks the
// caller's request (submission, status change, etc.). Recipient rows stay
// "queued" if the mailer is unreachable, so nothing is lost.

import { createServiceClient } from "@/lib/supabase/server";
import { renderTemplate, type Placeholders } from "@/lib/email-templates";

export type MailRecipient = {
  email: string;
  userId?: string | null;
  values?: Placeholders; // overrides the template's default placeholder values
};

export type SendTemplateResult = { ok: boolean; sendId?: string; error?: string };

export function firstNameOf(fullName: string | null | undefined, fallback = "there"): string {
  const n = (fullName ?? "").trim().split(/\s+/)[0];
  return n || fallback;
}

export async function sendTemplate(opts: {
  templateId: string;
  recipients: MailRecipient[];
  kind?: "transactional" | "broadcast";
  context?: Record<string, unknown>;
  createdBy?: string | null;
}): Promise<SendTemplateResult> {
  const { templateId, kind = "transactional", context = {}, createdBy = null } = opts;

  // De-dupe by email (last value wins) so the recs<->payload mapping is unambiguous.
  const byEmail = new Map<string, MailRecipient>();
  for (const r of opts.recipients) {
    const email = r.email?.trim().toLowerCase();
    if (email) byEmail.set(email, { ...r, email });
  }
  const recipients = [...byEmail.values()];
  if (recipients.length === 0) return { ok: true };

  const supabase = createServiceClient();

  // 1. Resolve the template (must be active).
  const { data: tpl, error: tErr } = await supabase
    .from("email_templates")
    .select("id, subject, body, placeholders, status")
    .eq("template_id", templateId)
    .maybeSingle();
  if (tErr || !tpl) {
    console.error("[mailer] template not found:", templateId, tErr?.message);
    return { ok: false, error: "template_not_found" };
  }
  if (tpl.status !== "active") {
    console.warn("[mailer] template not active, skipping:", templateId);
    return { ok: false, error: "template_inactive" };
  }
  const defaults = (tpl.placeholders ?? {}) as Placeholders;

  // The mailer must be configured AND reachable before we record anything —
  // otherwise we'd leave orphan "queued" rows when the service is down.
  const url = process.env.DOTNET_MAILER_URL;
  const secret = process.env.INTERNAL_MAILER_SECRET;
  if (!url || !secret) {
    console.warn("[mailer] DOTNET_MAILER_URL / INTERNAL_MAILER_SECRET not set");
    return { ok: false, error: "mailer_not_configured" };
  }
  const base = url.replace(/\/$/, "");
  if (!(await mailerReachable(base))) {
    console.warn("[mailer] service unreachable; nothing recorded");
    return { ok: false, error: "mailer_unavailable" };
  }

  // 2. Record the send (usage).
  const { data: send, error: sErr } = await supabase
    .from("email_sends")
    .insert({ template_id: tpl.id, kind, subject: tpl.subject, context, created_by: createdBy })
    .select("id")
    .single();
  if (sErr || !send) {
    console.error("[mailer] failed to record send:", sErr?.message);
    return { ok: false, error: "send_insert_failed" };
  }

  // 3. Record recipients (queued).
  const { data: recs, error: rErr } = await supabase
    .from("email_recipients")
    .insert(recipients.map((r) => ({ send_id: send.id, to_email: r.email, to_user_id: r.userId ?? null })))
    .select("id, to_email");
  if (rErr || !recs) {
    console.error("[mailer] failed to record recipients:", rErr?.message);
    return { ok: false, sendId: send.id, error: "recipients_insert_failed" };
  }

  // 4. Render per recipient (map back by email).
  const payload = recs.map((rec) => {
    const values = { ...defaults, ...(byEmail.get(rec.to_email)?.values ?? {}) };
    return {
      recipientId: rec.id,
      email: rec.to_email,
      subject: renderTemplate(tpl.subject, values),
      html: renderTemplate(tpl.body, values),
    };
  });

  // 5. Hand off to the .NET mailer. If it fails after we recorded the rows,
  // roll the send back so nothing is left dangling as "queued".
  try {
    const res = await fetch(`${base}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Secret": secret },
      body: JSON.stringify({ recipients: payload }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("[mailer] .NET mailer responded", res.status);
      await supabase.from("email_sends").delete().eq("id", send.id); // cascades to recipients
      return { ok: false, error: "mailer_unavailable" };
    }
  } catch (e) {
    console.error("[mailer] .NET mailer unreachable:", e instanceof Error ? e.message : e);
    await supabase.from("email_sends").delete().eq("id", send.id); // cascades to recipients
    return { ok: false, error: "mailer_unavailable" };
  }

  return { ok: true, sendId: send.id };
}

// Quick liveness check so we never record a send when the mailer is down.
async function mailerReachable(base: string): Promise<boolean> {
  try {
    const res = await fetch(`${base}/api/email/ping`, { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
}
