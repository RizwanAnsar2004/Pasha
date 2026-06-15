-- P@SHA verified flag on databank rows.
--
-- Admins can toggle this from the admin databank table. The frontend renders
-- a small check badge next to the startup name on both the listing and the
-- detail page, with a tooltip explaining what the badge does and doesn't
-- represent (see UI copy for legal framing).
--
-- Apply via: Supabase dashboard → SQL editor → paste + run.

ALTER TABLE databank
  ADD COLUMN IF NOT EXISTS pasha_verified    boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pasha_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS pasha_verified_by text;

-- Partial index — almost every row is unverified, so this stays tiny.
CREATE INDEX IF NOT EXISTS databank_pasha_verified_idx
  ON databank (pasha_verified)
  WHERE pasha_verified = true;

COMMENT ON COLUMN databank.pasha_verified IS
  'True when a P@SHA admin has marked the row as "P@SHA verified". '
  'Indicates good-faith review of public profile data only — not due-diligence '
  'verification or warranty of company claims.';
