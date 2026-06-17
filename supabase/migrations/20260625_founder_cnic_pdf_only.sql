-- founder_cnic was seeded to accept both PDF and images, but the pitch-decks
-- bucket (which backs this field) is PDF-only. Lock the form-config row to
-- PDF so the file picker rejects images client-side before the upload POST.

UPDATE form_config
SET validation = jsonb_set(
  COALESCE(validation, '{}'::jsonb),
  '{accept}',
  '{"application/pdf":[".pdf"]}'::jsonb,
  true
)
WHERE field_key = 'founder_cnic';
