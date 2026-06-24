-- Company registration certificate should accept PDF only (like the business
-- profile upload), not images. Update the FILE_UPLOAD field's accept config.
UPDATE form_fields
SET validation = '{"bucket":"pitch-decks","maxSizeMB":10,"accept":{"application/pdf":[".pdf"]}}'::jsonb
WHERE field_key = 'company_reg_cert';
