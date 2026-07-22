-- Email usage log (normalized) + seeded default templates.
--
-- Three tables, linked by id:
--   email_templates  (definitions — created in 20260626)
--        ▲ template_id (uuid FK)
--   email_sends      (one row per SEND / usage event: which template, when, why)
--        ▲ send_id (uuid FK)
--   email_recipients (one row per address in that send: delivery status)
--
-- Next.js inserts a send + its recipients (queued) after rendering; the .NET
-- mailer flips each recipient to sent/failed. Custom selection OR broadcast both
-- produce one send with N recipients.
--
-- Idempotent. Paste into Supabase Dashboard → SQL Editor → Run.
-- Requires 20260626_email_templates.sql first.

-- ── Usage: one row per send event ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_sends (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   UUID REFERENCES email_templates (id) ON DELETE SET NULL,
  kind          TEXT NOT NULL DEFAULT 'transactional'
                CHECK (kind IN ('transactional', 'broadcast')),
  subject       TEXT NOT NULL DEFAULT '',             -- rendered subject snapshot
  context       JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { trigger, submission_id, ... }
  created_by    TEXT,                                 -- admin email (broadcast) / null (system)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_sends_template_idx ON email_sends (template_id);
CREATE INDEX IF NOT EXISTS email_sends_created_at_idx ON email_sends (created_at DESC);

ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE email_sends IS 'One row per email send event (usage). Links a template to its recipients.';
COMMENT ON COLUMN email_sends.template_id IS 'FK to email_templates.id (null if the template was later deleted or for raw sends).';

-- ── Recipients: one row per address in a send ────────────────────────────────
CREATE TABLE IF NOT EXISTS email_recipients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id       UUID NOT NULL REFERENCES email_sends (id) ON DELETE CASCADE,
  to_email      TEXT NOT NULL,
  to_user_id    UUID,                                 -- profiles.id when known
  status        TEXT NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued', 'sent', 'failed')),
  error         TEXT,
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_recipients_send_idx ON email_recipients (send_id);
CREATE INDEX IF NOT EXISTS email_recipients_status_idx ON email_recipients (status);
CREATE INDEX IF NOT EXISTS email_recipients_to_email_idx ON email_recipients (to_email);

ALTER TABLE email_recipients ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE email_recipients IS 'One row per recipient address within an email_sends row.';

-- ── Seed default lifecycle templates ─────────────────────────────────────────
INSERT INTO email_templates (template_id, name, subject, body, placeholders, status, is_default, description)
VALUES
  (
    'submission_received',
    'Submission received',
    'We received your application, {{first_name}}',
    '<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6;">'
    '<h2 style="color:#c8102e;">Thank you, {{first_name}}!</h2>'
    '<p>We''ve received your submission for <strong>{{startup_name}}</strong>. Our committee will review it and get back to you.</p>'
    '<p>You can track your application status any time from your dashboard:</p>'
    '<p><a href="{{link}}" style="background:#c8102e;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">View application</a></p>'
    '<p style="color:#6b7280;font-size:13px;">— The PASHA Startup Committee</p>'
    '</body></html>',
    '{"{{first_name}}":"there","{{startup_name}}":"your startup","{{link}}":"https://pasha.org/apply"}'::jsonb,
    'active', true,
    'Sent automatically when an applicant submits their application.'
  ),
  (
    'submission_approved',
    'Submission approved',
    'Great news — {{startup_name}} has been approved',
    '<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6;">'
    '<h2 style="color:#16a34a;">Congratulations, {{first_name}}!</h2>'
    '<p><strong>{{startup_name}}</strong> has been <strong>approved</strong> and is now listed in the PASHA directory.</p>'
    '<p><a href="{{link}}" style="background:#c8102e;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">View your listing</a></p>'
    '<p style="color:#6b7280;font-size:13px;">— The PASHA Startup Committee</p>'
    '</body></html>',
    '{"{{first_name}}":"there","{{startup_name}}":"your startup","{{link}}":"https://pasha.org/directory"}'::jsonb,
    'active', true,
    'Sent automatically when a submission status changes to approved.'
  ),
  (
    'submission_rejected',
    'Submission rejected',
    'Update on your application for {{startup_name}}',
    '<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6;">'
    '<h2>Hello {{first_name}},</h2>'
    '<p>Thank you for submitting <strong>{{startup_name}}</strong>. After review, we''re unable to approve it at this time.</p>'
    '<p>{{reviewer_notes}}</p>'
    '<p>You''re welcome to apply again in the future.</p>'
    '<p style="color:#6b7280;font-size:13px;">— The PASHA Startup Committee</p>'
    '</body></html>',
    '{"{{first_name}}":"there","{{startup_name}}":"your startup","{{reviewer_notes}}":""}'::jsonb,
    'active', true,
    'Sent automatically when a submission status changes to rejected.'
  ),
  (
    'submission_needs_update',
    'Submission needs update',
    'Action needed on your application for {{startup_name}}',
    '<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6;">'
    '<h2>Hello {{first_name}},</h2>'
    '<p>We need a few more details before we can finish reviewing <strong>{{startup_name}}</strong>.</p>'
    '<p>{{reviewer_notes}}</p>'
    '<p><a href="{{link}}" style="background:#c8102e;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Update your application</a></p>'
    '<p style="color:#6b7280;font-size:13px;">— The PASHA Startup Committee</p>'
    '</body></html>',
    '{"{{first_name}}":"there","{{startup_name}}":"your startup","{{reviewer_notes}}":"","{{link}}":"https://pasha.org/apply"}'::jsonb,
    'active', true,
    'Sent automatically when a submission status changes to needs_update.'
  ),
  (
    'submission_watchlist',
    'Submission watchlisted',
    'Your application for {{startup_name}} is under further review',
    '<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6;">'
    '<h2>Hello {{first_name}},</h2>'
    '<p><strong>{{startup_name}}</strong> has been placed on our watchlist for further review. We''ll be in touch with next steps.</p>'
    '<p style="color:#6b7280;font-size:13px;">— The PASHA Startup Committee</p>'
    '</body></html>',
    '{"{{first_name}}":"there","{{startup_name}}":"your startup"}'::jsonb,
    'active', true,
    'Sent automatically when a submission status changes to watchlist.'
  ),
  (
    'startup_featured',
    'Startup featured',
    '{{startup_name}} is now featured on PASHA',
    '<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6;">'
    '<h2 style="color:#c8102e;">You''re featured, {{first_name}}!</h2>'
    '<p><strong>{{startup_name}}</strong> has been selected as a featured startup on the PASHA directory.</p>'
    '<p><a href="{{link}}" style="background:#c8102e;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">See your feature</a></p>'
    '<p style="color:#6b7280;font-size:13px;">— The PASHA Startup Committee</p>'
    '</body></html>',
    '{"{{first_name}}":"there","{{startup_name}}":"your startup","{{link}}":"https://pasha.org/directory"}'::jsonb,
    'active', true,
    'Sent automatically when a startup is marked as featured.'
  )
ON CONFLICT (template_id) DO NOTHING;
