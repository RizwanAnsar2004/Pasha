-- De-duplicate the application form against the registration form (spec §3).
--
-- The 'registration' form (20260618) now collects startup_name, tagline,
-- location, stage and primary_sector at sign-up, and those values prefill the
-- application draft (same field_keys). Asking for them again in the
-- application's "Startup" step is redundant, so hide them there.
--
-- We HIDE (visible = false) rather than DELETE: the submit pipeline
-- (routeValues) only maps fields that exist in the config to their
-- submissions columns, so a deleted field would silently drop the value the
-- user already gave at registration and break the directory/vetting. A hidden
-- field stays in the schema and still routes its prefilled value to its
-- column — it just doesn't render. We also clear `required` so a legacy
-- applicant whose draft predates the registration form can't get stuck behind
-- a hidden-but-required field (registration itself keeps these required).
--
-- Idempotent. Paste into Supabase Dashboard → SQL Editor → Run.

UPDATE form_fields AS f
SET visible = false,
    required = false,
    updated_at = now()
FROM form_sections AS s
WHERE f.section_id = s.id
  AND s.key = 'startup'
  AND (s.form_key = 'application' OR s.form_key IS NULL)
  AND f.field_key IN (
    'startup_name',
    'tagline',
    'location',
    'h_location',   -- the "Location" heading is now empty once `location` is hidden
    'stage',
    'primary_sector'
  );
