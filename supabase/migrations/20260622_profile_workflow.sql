-- Spec §12 — profile submission workflow + completion score.
--
-- IMPORTANT: in this database `submissions.status` is a Postgres ENUM
-- (`submission_status`), so the new workflow states must be added to the enum
-- type before the app can write them. Postgres also forbids USING a freshly
-- added enum value in the same transaction that adds it — so this migration
-- only ADDS the values (+ the completion_score column) and never references
-- them. Legacy 'pending' rows keep working: src/lib/workflow.ts maps
-- 'pending' → "Submitted" for display, so no data rewrite is needed.
--
-- The six workflow stages (Draft → Submitted → Needs Update → Approved →
-- Verified → Featured) are derived in code from submissions.status +
-- databank.pasha_verified + featured_startups.
--
-- Idempotent. Paste into Supabase Dashboard → SQL Editor → Run.

-- 1. Extend the status enum with the spec vocabulary the app now writes.
--    ('approved' / 'rejected' / 'pending' / 'watchlist' already exist.)
ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'submitted';
ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'needs_update';

-- 2. Profile completion score (0–100), computed from the application data at
--    submit time so admins can see how complete a profile is.
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS completion_score INTEGER;

COMMENT ON COLUMN submissions.completion_score IS
  'Profile completion percentage (spec §12 ladder: 25/50/75/90/100) computed from the application data at submit time.';
