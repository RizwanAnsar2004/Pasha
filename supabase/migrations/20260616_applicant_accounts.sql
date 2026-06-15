-- Applicant accounts + server-side draft applications.
--
-- Puts the public apply form behind a *separate* auth wall (Supabase Auth users
-- who are NOT in admin_users). Each applicant gets one resumable draft so they
-- can fill the admin-configured form step by step, save partial progress, come
-- back, review/edit, and submit when ready.
--
-- Two changes:
--   1. application_drafts — one row per applicant, holds the in-progress form
--      values (same field_key-keyed shape the form posts) + the current step.
--      On final submit it is linked to the created submissions row and stamped.
--   2. submissions.user_id — links a finished submission to the applicant who
--      created it (nullable; pre-existing rows + admin-entered rows stay null).
--
-- Idempotent. Paste into Supabase Dashboard -> SQL Editor -> Run.

-- ===== application_drafts — resumable in-progress applications =====
CREATE TABLE IF NOT EXISTS application_drafts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT,
  data           JSONB NOT NULL DEFAULT '{}'::jsonb,  -- full form values, keyed by field_key
  current_step   INTEGER NOT NULL DEFAULT 0,          -- wizard step index the user left off on
  submission_id  UUID REFERENCES submissions(id) ON DELETE SET NULL,
  submitted_at   TIMESTAMPTZ,                          -- set when the draft is finalised
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS application_drafts_user_idx
  ON application_drafts (user_id);

-- ===== submissions.user_id — owning applicant for a finished submission =====
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN submissions.user_id IS
  'The applicant (auth.users) who submitted this application. Null for rows created before applicant accounts or entered directly by admins.';

-- ===== RLS — deny anon; all access via service-role (same as other tables) =====
ALTER TABLE application_drafts ENABLE ROW LEVEL SECURITY;
-- No policies for anon/authenticated -> default deny. The applicant API routes
-- read the Supabase session, then act on the user's own draft via service-role.
