-- ============================================================================
-- COMBINED PROD MIGRATION — 2026-07-29
--
-- Consolidates every pending prod_migrations change into one runnable file.
-- Run once on BOTH dev and prod. Fully idempotent — safe to re-run.
--
-- Sections (kept in dependency order):
--   1. edit_requests table + 'databank_edit_request' email template
--   2. databank.updated_at column (+ back-fill)
--   3. databank.data_status column (+ index + back-fill from edit_requests)
--   4. Market & competition form copy (market sizing is public)
--
-- Requires the base schema + email template tables
-- (20260626_email_templates.sql, 20260627_email_log_and_defaults.sql).
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Admin-requested partial edits for databank startups (edit_requests)
--
-- Once a startup is approved into the databank its application is locked
-- (application_drafts.submitted_at is set). This adds a way for an admin to
-- reopen ONLY specific parts of the form for that startup to fill/correct:
--   * the whole form,                      (whole_form = true)
--   * one or more whole sections/steps,    (section_keys[])
--   * individual fields across any sections. (field_keys[])
--
-- field_keys is the resolved allow-list the applicant portal gates on; a
-- whole-section or whole-form request is expanded into field_keys at write
-- time (section_keys / whole_form are kept for display + re-expansion).
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS edit_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- target
  submission_id  UUID REFERENCES submissions (id) ON DELETE CASCADE,
  databank_id    UUID REFERENCES databank (id)    ON DELETE CASCADE,
  user_id        UUID,                                 -- applicant (submissions.user_id); who fills it

  -- scope of what is unlocked
  whole_form     BOOLEAN NOT NULL DEFAULT false,       -- open the entire form
  section_keys   JSONB   NOT NULL DEFAULT '[]'::jsonb, -- form_sections.key values requested (intent/display)
  field_keys     JSONB   NOT NULL DEFAULT '[]'::jsonb, -- resolved field_key allow-list the portal gates on

  -- admin message / handling
  note           TEXT,                                 -- shown to the startup + emailed
  due_at         TIMESTAMPTZ,                          -- optional soft deadline
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'submitted', 'cancelled')),

  -- audit
  requested_by       UUID,                             -- admin auth id
  requested_by_email TEXT,                             -- admin email snapshot
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ,
  submitted_at   TIMESTAMPTZ                           -- when the startup completed the request
);

CREATE INDEX IF NOT EXISTS edit_requests_user_status_idx ON edit_requests (user_id, status);
CREATE INDEX IF NOT EXISTS edit_requests_submission_idx   ON edit_requests (submission_id);
CREATE INDEX IF NOT EXISTS edit_requests_databank_idx     ON edit_requests (databank_id);

-- At most one OPEN (pending) request per applicant, so the portal has a single
-- unambiguous "what is unlocked right now" answer. Admin re-requests merge into
-- this row. (NULL user_id rows are exempt — they can't be filled anyway.)
CREATE UNIQUE INDEX IF NOT EXISTS edit_requests_one_open_per_user_idx
  ON edit_requests (user_id) WHERE status = 'pending' AND user_id IS NOT NULL;

-- Accessed only via service-role from server routes (same posture as
-- application_drafts). RLS on with no policies = deny all anon/authenticated.
ALTER TABLE edit_requests ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE edit_requests IS 'Admin-requested partial re-open of a databank startup''s locked application form.';
COMMENT ON COLUMN edit_requests.field_keys IS 'Resolved allow-list of form_fields.field_key the applicant may edit while this request is pending.';
COMMENT ON COLUMN edit_requests.whole_form IS 'When true the entire form is editable regardless of field_keys.';

-- ── Notification template ────────────────────────────────────────────────────
INSERT INTO email_templates (template_id, name, subject, body, placeholders, status, is_default, description)
VALUES
  (
    'databank_edit_request',
    'Databank edit request',
    'Please update your PASHA profile — {{startup_name}}',
    '<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6;">'
    '<h2 style="color:#c8102e;">Hello {{first_name}},</h2>'
    '<p>The PASHA committee has requested some updates to your profile for <strong>{{startup_name}}</strong>.</p>'
    '<p>{{note}}</p>'
    '<p style="margin:0 0 6px;"><strong>What we need you to update:</strong></p>'
    '<p style="color:#374151;">{{requested_items}}</p>'
    '<p>Only the requested parts of your application are open for editing — everything else stays as-is.</p>'
    '<p><a href="{{link}}" style="background:#c8102e;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Update your profile</a></p>'
    '<p style="color:#6b7280;font-size:13px;">— The PASHA Startup Committee</p>'
    '</body></html>',
    '{"{{first_name}}":"there","{{startup_name}}":"your startup","{{note}}":"","{{requested_items}}":"","{{link}}":"https://pasha.org/apply"}'::jsonb,
    'active', true,
    'Sent when an admin asks a databank startup to fill or correct specific fields/sections.'
  )
ON CONFLICT (template_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. databank.updated_at
--
-- The databank report's merged date filter (and its "Last updated" column) read
-- databank.updated_at, but the live table predates that column. Add it
-- idempotently and seed existing rows to their created_at so the "added or
-- updated" filter and the report column have values. Going forward the approve /
-- edit-request resync (publishSubmissionToDatabank) stamps updated_at.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE databank ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE databank SET updated_at = created_at WHERE updated_at IS NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. databank.data_status
--
-- Per-startup "profile/data status" tracking the request-info lifecycle:
--   none           — default, nothing outstanding (shown as no badge)
--   info_requested — admin asked the startup to fill/correct data
--   updated        — the startup submitted the requested info (flag for review)
--
-- Default is 'none' (not "complete") so a full list of startups isn't
-- misleadingly labelled as complete. (edit_requests is created in section 1
-- above, so the back-fill below always finds it.)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE databank ADD COLUMN IF NOT EXISTS data_status TEXT NOT NULL DEFAULT 'none';

CREATE INDEX IF NOT EXISTS databank_data_status_idx ON databank (data_status);

-- Back-fill: mark rows that already have an open (pending) edit request.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'edit_requests') THEN
    UPDATE databank d
    SET data_status = 'info_requested'
    WHERE d.data_status = 'none'
      AND EXISTS (
        SELECT 1 FROM edit_requests er WHERE er.databank_id = d.id AND er.status = 'pending'
      );
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Market & competition form copy
--
-- Market sizing (TAM/SAM/SOM) IS shown on the public startup profile; only the
-- competitor details are kept private. The original copy wrongly told founders
-- the whole "Market & competition" section was private/investor-only. Reword it
-- so the promise matches reality (per client decision to keep market sizing
-- public).
-- ────────────────────────────────────────────────────────────────────────────

UPDATE form_sections
SET subtitle = 'Competitors and market sizing. Your market sizing (TAM / SAM / SOM) is shown publicly on your profile; competitor details are kept private.'
WHERE key = 'market' AND form_key = 'application';

UPDATE form_fields f
SET hint = 'Shown publicly on your profile. Exact numbers are optional for early-stage startups.'
FROM form_sections s
WHERE f.section_id = s.id
  AND s.key = 'market' AND s.form_key = 'application'
  AND f.field_key = 'h_market';

COMMIT;
