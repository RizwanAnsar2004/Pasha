-- Structured awards: each award carries a title, year, and description — entered
-- by applicants (repeatable group on the apply form) AND by admins (Award Winners
-- tab). Surfaced on the public startup profile's "Awards & recognition" section.
--
-- Idempotent. Safe to re-run. Paste into Supabase SQL Editor, or apply via
-- scripts/db-exec.ts.

-- 1. startup_awards gains a description column (title + year already exist).
ALTER TABLE startup_awards ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Convert the applicant form's "awards" field from a free-text textarea
--    (input_type 5, column_map 'awards') into a repeatable GROUP (input_type 20).
--    The structured array now lands in submissions.answers.awards instead of the
--    legacy submissions.awards text column.
UPDATE form_fields
SET input_type = 20,          -- GROUP
    repeatable  = true,
    column_map  = NULL,
    min_items   = 0,
    max_items   = 12,
    item_label  = 'award',
    label       = 'Awards & recognition',
    hint        = 'Add each award or recognition — its title, the year, and a short description.',
    placeholder = NULL,
    validation  = '{}'::jsonb,
    updated_at  = now()
WHERE field_key = 'awards' AND parent_field_id IS NULL AND input_type = 5;

-- 3. Child fields of the awards group (title / year / description). Idempotent:
--    only inserted when the awards group has no children yet.
INSERT INTO form_fields
  (section_id, parent_field_id, field_key, label, input_type, required, validation, placeholder, sort_order, visible)
SELECT a.section_id, a.id, v.field_key, v.label, v.input_type, v.required, v.validation, v.placeholder, v.sort_order, true
FROM form_fields a
CROSS JOIN (VALUES
  ('title',       'Award title', 0, true,  '{"maxLength":200}'::jsonb,                      'e.g. Winner — P@SHA ICT Awards',      0),
  ('year',        'Year',        4, false, '{"min":1900,"max":2100,"integer":true}'::jsonb, '2024',                                1),
  ('description', 'Description', 5, false, '{"maxLength":300}'::jsonb,                      'What it was awarded for (optional)…', 2)
) AS v(field_key, label, input_type, required, validation, placeholder, sort_order)
WHERE a.field_key = 'awards' AND a.parent_field_id IS NULL AND a.input_type = 20
  AND NOT EXISTS (SELECT 1 FROM form_fields c WHERE c.parent_field_id = a.id);
