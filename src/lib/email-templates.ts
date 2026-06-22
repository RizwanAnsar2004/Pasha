// Shared types + constants for admin-managed email templates.

export type EmailTemplateStatus = "draft" | "active" | "archived";

export const EMAIL_TEMPLATE_STATUSES: { value: EmailTemplateStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

// Stored as a JSONB object on the row: { "{{first_name}}": "Recipient first name" }.
export type Placeholders = Record<string, string>;

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
