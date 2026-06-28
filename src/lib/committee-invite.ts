// Committee-member onboarding: generate a one-time password and email the new
// admin their sign-in details (email + role + password). Server-only.

import { sendRawEmail } from "@/lib/mailer";
import type { SendTemplateResult } from "@/lib/mailer";

// Unambiguous character set (no 0/O/1/l/I) so the password is easy to read and
// type from an email. ~14 chars from a 58-symbol alphabet is plenty of entropy.
const PW_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%";

export function generatePassword(length = 14): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) out += PW_ALPHABET[bytes[i] % PW_ALPHABET.length];
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Email a newly-created committee member their login credentials. */
export function sendCommitteeInvite(opts: {
  email: string;
  role: string | null;
  password: string;
  createdBy?: string | null;
}): Promise<SendTemplateResult> {
  const { email, role, password, createdBy = null } = opts;
  const roleLabel = role?.trim() || "Committee member";
  const subject = "Your P@SHA committee admin access";

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
    <h1 style="font-size:20px;margin:0 0 8px;">Welcome to the P@SHA committee portal</h1>
    <p style="font-size:14px;line-height:1.6;color:#444;margin:0 0 20px;">
      An administrator has created a committee account for you. Use the details
      below to sign in to the admin portal.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 20px;">
      <tr>
        <td style="padding:8px 12px;background:#f5f5f4;border:1px solid #e7e5e4;width:120px;color:#666;">Email</td>
        <td style="padding:8px 12px;border:1px solid #e7e5e4;font-weight:600;">${escapeHtml(email)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#f5f5f4;border:1px solid #e7e5e4;color:#666;">Role</td>
        <td style="padding:8px 12px;border:1px solid #e7e5e4;">${escapeHtml(roleLabel)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#f5f5f4;border:1px solid #e7e5e4;color:#666;">Password</td>
        <td style="padding:8px 12px;border:1px solid #e7e5e4;font-family:monospace;font-size:15px;letter-spacing:0.5px;">${escapeHtml(password)}</td>
      </tr>
    </table>
    <p style="font-size:12px;line-height:1.6;color:#888;margin:0;">
      For your security, please sign in and change this password as soon as
      possible. If you weren't expecting this email, you can ignore it.
    </p>
  </div>`;

  return sendRawEmail({
    to: { email },
    subject,
    html,
    kind: "transactional",
    context: { trigger: "committee_invite", role: roleLabel },
    createdBy,
  });
}
