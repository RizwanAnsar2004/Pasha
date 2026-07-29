-- Market sizing (TAM/SAM/SOM) IS shown on the public startup profile; only the
-- competitor details are kept private. The original form copy wrongly told
-- founders the whole "Market & competition" section was private/investor-only.
-- Reword it so the promise matches reality (per client decision to keep market
-- sizing public).
--
-- Idempotent (UPDATEs). Run on BOTH dev and prod.

UPDATE form_sections
SET subtitle = 'Competitors and market sizing. Your market sizing (TAM / SAM / SOM) is shown publicly on your profile; competitor details are kept private.'
WHERE key = 'market' AND form_key = 'application';

UPDATE form_fields f
SET hint = 'Shown publicly on your profile. Exact numbers are optional for early-stage startups.'
FROM form_sections s
WHERE f.section_id = s.id
  AND s.key = 'market' AND s.form_key = 'application'
  AND f.field_key = 'h_market';
