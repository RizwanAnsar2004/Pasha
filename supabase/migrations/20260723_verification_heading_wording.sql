-- Reword the "Verification" section heading. "Admin-only" read as if only admins
-- could edit these fields, but the applicant fills them in — they are simply
-- private (visible to admins only, never public). Clarify the label and blurb.
UPDATE form_fields
SET label = 'Verification (private)',
    placeholder = 'Used by the committee to verify your startup. Private — visible to admins only, never shown publicly.'
WHERE field_key = 'h_verification';
