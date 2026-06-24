-- Registration form (spec §3) + email-verification support.
--
-- 1. form_sections.form_key — lets the SAME form-builder infra drive more than
--    one form. Existing rows default to 'application' (the post-login apply
--    form). A new 'registration' form holds the minimum sign-up fields.
-- 2. application_drafts consent columns — spec §3 requires recording the terms
--    consent timestamp, IP and policy version.
-- 3. Seed a 'registration' section + the customizable §3 profile fields. Email
--    and password are NOT modelled here — they're fixed account fields handled
--    by the sign-up UI. Field keys mirror the application form so the values a
--    user enters at registration prefill their later application.
--
-- Idempotent. Paste into Supabase Dashboard → SQL Editor → Run.

-- ===== 1. form_key on form_sections =====
ALTER TABLE form_sections
  ADD COLUMN IF NOT EXISTS form_key TEXT NOT NULL DEFAULT 'application';

CREATE INDEX IF NOT EXISTS form_sections_form_key_idx
  ON form_sections (form_key, step, sort_order);

COMMENT ON COLUMN form_sections.form_key IS
  'Which form this section belongs to: ''application'' (post-login apply form) or ''registration'' (sign-up). The builder edits each form independently.';

-- ===== 2. consent columns on application_drafts =====
ALTER TABLE application_drafts
  ADD COLUMN IF NOT EXISTS consent_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_ip      TEXT,
  ADD COLUMN IF NOT EXISTS consent_version TEXT;

COMMENT ON COLUMN application_drafts.consent_at IS
  'When the applicant accepted the terms/privacy/data-usage agreement at registration.';

-- ===== 3. Seed the registration form (only if not already present) =====
INSERT INTO form_sections (key, title, subtitle, step, sort_order, is_active, form_key)
SELECT 'reg_basics',
       'Startup basics',
       'Tell us a little about your startup. You can complete the full profile after you sign in.',
       1, 0, true, 'registration'
WHERE NOT EXISTS (SELECT 1 FROM form_sections WHERE form_key = 'registration');

-- Profile fields for the registration section. Guarded so re-runs are no-ops.
-- input_type ints: 0 text 1 email 2 url 3 phone 4 number 5 textarea 6 select
-- 7 multiselect 8 yes/no 9 radio 10 date 20 group 30 heading 90 file 91 city.
INSERT INTO form_fields
  (section_id, parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
SELECT s.id, x.parent_field_id, x.field_key, x.label, x.hint, x.placeholder, x.input_type, x.required, x.validation, x.options, x.options_source, x.repeatable, x.min_items, x.max_items, x.item_label, x.column_map, x.visible, x.sort_order, x.conditional
FROM form_sections s
CROSS JOIN (VALUES
  (NULL::uuid,'full_name','Your full name','Account owner / representative — not shown publicly.','Jane Doe',0,true,'{"minLength":2}'::jsonb,NULL::jsonb,NULL::text,false,NULL::int,NULL::int,NULL::text,NULL::text,true,0,NULL::jsonb),
  (NULL,'founder_mobile','Mobile / WhatsApp number','Used for account recovery and committee communication.','+92 3xx xxxxxxx',3,true,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,1,NULL),
  (NULL,'startup_name','Startup name',NULL,'Acme Inc.',0,true,'{"minLength":2}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,2,NULL),
  (NULL,'location','Headquarters',NULL,NULL,91,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,3,NULL),
  (NULL,'stage','Current stage',NULL,'Pick a stage',6,true,'{}'::jsonb,NULL,'STAGES',false,NULL,NULL,NULL,NULL,true,4,NULL),
  (NULL,'primary_sector','Primary sector',NULL,'Pick a sector',6,true,'{}'::jsonb,NULL,'SECTORS',false,NULL,NULL,NULL,NULL,true,5,NULL),
  (NULL,'tagline','One-line description','A short line on what you do — shown on your directory card.','We help X do Y',11,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,6,NULL),
  (NULL,'terms_accepted','I agree to the terms, privacy policy and data-usage agreement',NULL,NULL,8,true,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,7,NULL)
) AS x(parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
WHERE s.form_key = 'registration'
  AND NOT EXISTS (SELECT 1 FROM form_fields f WHERE f.section_id = s.id);
