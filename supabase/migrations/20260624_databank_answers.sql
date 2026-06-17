-- Carry the dynamic form fields onto the public directory row.
--
-- The application form is admin-customizable, so most of its fields (problem,
-- solution, USP, product, traction, market, etc.) land in submissions.answers
-- (JSONB) rather than dedicated columns. To show them on the public profile we
-- mirror that bag onto the databank row on approval — a single JSONB column,
-- not per-field columns, so it keeps working as admins add/rename fields.
--
-- (women_led / hiring / fundraising stay as dedicated columns — see
-- 20260623 — because the directory FILTERS/badges query them.)
--
-- Idempotent. Paste into Supabase Dashboard → SQL Editor → Run.

ALTER TABLE databank
  ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN databank.answers IS
  'Dynamic application-form field values (field_key → value), mirrored from submissions.answers on approval. Powers the public profile''s richer sections.';
