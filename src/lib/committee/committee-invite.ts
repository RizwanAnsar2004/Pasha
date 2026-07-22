// Committee-member onboarding: generate a one-time password and email the new

import { sendRawEmail } from "@/lib/email/mailer";
import type { SendTemplateResult } from "@/lib/email/mailer";
import { wrapEmail } from "@/lib/email/email-shell";

// Unambiguous character set (no 0/O/1/l/I) so the password is easy to read and
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

// Email a newly-created committee member their login credentials.
export function sendCommitteeInvite(opts: {
  email: string;
  role: string | null;
  password: string;
  createdBy?: string | null;
  // Public origin of the request, for the login link (nginx + Vercel safe).
  origin: string;
}): Promise<SendTemplateResult> {
  const { email, role, password, createdBy = null, origin } = opts;
  const roleLabel = role?.trim() || "Committee member";
  const subject = "Your PASHA committee admin access";

  // Where the new member signs in. Uses the real public origin (same approach
  const loginUrl = `${origin.replace(/\/$/, "")}/admin`;

  // Inner content only — the shared PASHA header/footer chrome (banner, brand
  const content = `
    <h1 style="font-family:'Poppins',sans-serif;font-size:20px;font-weight:700;margin:0 0 8px;color:#0E0E10;">Welcome to the PASHA committee portal</h1>
    <p style="font-family:'Poppins',sans-serif;font-size:14px;line-height:1.6;color:#444;margin:0 0 20px;">
      An administrator has created a committee account for you. Use the details
      below to sign in to the admin portal.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 20px;font-family:'Poppins',sans-serif;">
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
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
      <tr>
        <td align="center" bgcolor="#E6160F" style="border-radius:6px;">
          <a href="${loginUrl}" target="_blank" style="display:inline-block;padding:12px 28px;font-family:'Poppins',sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Sign in to the admin portal</a>
        </td>
      </tr>
    </table>
    <p style="font-family:'Poppins',sans-serif;font-size:13px;line-height:1.6;color:#444;margin:0 0 20px;">
      Or open this link directly:
      <a href="${loginUrl}" target="_blank" style="color:#E6160F;text-decoration:none;word-break:break-all;">${escapeHtml(loginUrl)}</a>
    </p>
    <p style="font-family:'Poppins',sans-serif;font-size:12px;line-height:1.6;color:#888;margin:0;">
      For your security, please sign in and change this password as soon as
      possible. If you weren't expecting this email, you can ignore it.
    </p>`;

  const html = wrapEmail(content);

  return sendRawEmail({
    to: { email },
    subject,
    html,
    kind: "transactional",
    context: { trigger: "committee_invite", role: roleLabel },
    createdBy,
  });
}
