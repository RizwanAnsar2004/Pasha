-- Make the registration "One-line description" (tagline) a true rich-text
-- (WYSIWYG) box instead of a single-line input. input_type 11 = rich text,
-- which the renderer (DynamicField) draws with the CKEditor-based RichTextField
-- and the AuthForm grid spans across both columns. The value is stored as an
-- HTML string, so the plain-char 160 maxLength cap is dropped.
UPDATE form_fields
SET input_type = 11,
    validation = '{}'::jsonb
WHERE field_key = 'tagline'
  AND section_id IN (
    SELECT id FROM form_sections WHERE form_key = 'registration'
  );
