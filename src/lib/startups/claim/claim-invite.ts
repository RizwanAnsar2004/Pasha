// Company-profile claim onboarding: email the new owner their sign-in
// credentials (mirrors the committee-member invite, but points at the applicant
// portal login instead of the admin portal).

import { sendRawEmail, type SendTemplateResult } from "@/lib/email/mailer";
import { wrapEmail } from "@/lib/email/email-shell";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Email a company owner after a successful claim. When `password` is provided
// (a freshly-provisioned or reset account) it's included so they can sign in;
// when omitted (the claimant was already signed in with this email) we send a
// confirmation instead and tell them to use their existing password.
export function sendClaimCredentials(opts: {
  email: string;
  company: string;
  password?: string | null;
  createdBy?: string | null;
  // Public origin of the request, for the login link.
  origin: string;
}): Promise<SendTemplateResult> {
  const { email, company, password, createdBy = null, origin } = opts;
  const subject = `You now manage ${company} on the PASHA Startup Hub`;

  // Where the new owner signs in.
  const loginUrl = `${origin.replace(/\/$/, "")}/apply/login`;

  const intro = password
    ? "Your claim was verified and an account has been created for you. Use the details below to sign in and manage your company profile."
    : "Your claim was verified. Sign in with your existing password to manage your company profile.";

  const passwordRow = password
    ? `
      <tr>
        <td style="padding:8px 12px;background:#f5f5f4;border:1px solid #e7e5e4;color:#666;">Password</td>
        <td style="padding:8px 12px;border:1px solid #e7e5e4;font-family:monospace;font-size:15px;letter-spacing:0.5px;">${escapeHtml(password)}</td>
      </tr>`
    : "";

  const content = `
    <h1 style="font-family:'Poppins',sans-serif;font-size:20px;font-weight:700;margin:0 0 8px;color:#0E0E10;">You're now the owner of ${escapeHtml(company)}</h1>
    <p style="font-family:'Poppins',sans-serif;font-size:14px;line-height:1.6;color:#444;margin:0 0 20px;">
      ${intro}
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 20px;font-family:'Poppins',sans-serif;">
      <tr>
        <td style="padding:8px 12px;background:#f5f5f4;border:1px solid #e7e5e4;width:120px;color:#666;">Email</td>
        <td style="padding:8px 12px;border:1px solid #e7e5e4;font-weight:600;">${escapeHtml(email)}</td>
      </tr>
      ${passwordRow}
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
      <tr>
        <td align="center" bgcolor="#E6160F" style="border-radius:6px;">
          <a href="${loginUrl}" target="_blank" style="display:inline-block;padding:12px 28px;font-family:'Poppins',sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Sign in to manage your profile</a>
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

  return sendRawEmail({
    to: { email },
    subject,
    html: wrapEmail(content),
    kind: "transactional",
    context: { trigger: "company_claim_credentials", company },
    createdBy,
  });
}
