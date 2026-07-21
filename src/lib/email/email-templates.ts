// Shared types + constants for admin-managed email templates.

export type EmailTemplateStatus = "draft" | "active" | "archived";

export const EMAIL_TEMPLATE_STATUSES: { value: EmailTemplateStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

// Stored as a JSONB object on the row: { "{{first_name}}": "Recipient first name" }.
export type Placeholders = Record<string, string>;

// The fixed catalog of placeholders the system knows how to fill at send time.
export const EMAIL_PLACEHOLDERS: { token: string; label: string; sample: string }[] = [
  { token: "{{first_name}}", label: "First name", sample: "Ali" },
  { token: "{{founder_name}}", label: "Founder name", sample: "Ali Khan" },
  { token: "{{startup_name}}", label: "Startup name", sample: "Acme AI" },
  { token: "{{website}}", label: "Website", sample: "https://acme.ai" },
  { token: "{{linkedin}}", label: "LinkedIn", sample: "https://linkedin.com/company/acme" },
  { token: "{{instagram}}", label: "Instagram", sample: "https://instagram.com/acme" },
  { token: "{{twitter}}", label: "X (Twitter)", sample: "https://x.com/acme" },
  { token: "{{facebook}}", label: "Facebook", sample: "https://facebook.com/acme" },
  { token: "{{youtube}}", label: "YouTube", sample: "https://youtube.com/@acme" },
  { token: "{{link}}", label: "Action link", sample: "https://pasha.org" },
];

// Default placeholder->sample map (used for previews and stored on the row).
export function placeholderDefaults(): Placeholders {
  return Object.fromEntries(EMAIL_PLACEHOLDERS.map((p) => [p.token, p.sample]));
}

export type EmailTemplateRow = {
  id: string;
  template_id: string;
  name: string;
  subject: string;
  body: string;
  placeholders: Placeholders;
  status: EmailTemplateStatus;
  is_default: boolean;
  description: string;
  author_email: string | null;
  created_at: string;
  updated_at: string | null;
};

export const EMAIL_TEMPLATE_COLS =
  "id,template_id,name,subject,body,placeholders,status,is_default,description,author_email,created_at,updated_at";

export function statusLabel(status: EmailTemplateStatus): string {
  return EMAIL_TEMPLATE_STATUSES.find((s) => s.value === status)?.label ?? status;
}

// Apply a placeholders map to a template string (used for previews / sending).
export function renderTemplate(text: string, values: Placeholders): string {
  return Object.entries(values).reduce(
    (acc, [token, value]) => acc.split(token).join(value),
    text
  );
}
