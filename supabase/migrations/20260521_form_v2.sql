-- Apply Form v2: 3-step rebuild adds structured founders, company socials,
-- explicit country (for outside-Pakistan), awards/certifications, and a
-- top-level founder_role for the primary submitter.
--
-- Idempotent. Paste into Supabase Dashboard → SQL Editor → Run.

-- ===== submissions =====

ALTER TABLE submissions
  -- shape: [{name, role, email?, mobile?, linkedin?, photo_url?, gender?, is_primary}]
  ADD COLUMN IF NOT EXISTS founders JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS company_linkedin  TEXT,
  ADD COLUMN IF NOT EXISTS company_x         TEXT,
  ADD COLUMN IF NOT EXISTS company_instagram TEXT,
  ADD COLUMN IF NOT EXISTS company_facebook  TEXT,
  ADD COLUMN IF NOT EXISTS company_youtube   TEXT;

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS hq_country      TEXT,
  ADD COLUMN IF NOT EXISTS outside_pakistan BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS awards         TEXT,
  ADD COLUMN IF NOT EXISTS certifications TEXT,
  ADD COLUMN IF NOT EXISTS founder_role   TEXT;

-- ===== databank (public/curated) =====

ALTER TABLE databank
  ADD COLUMN IF NOT EXISTS key_persons      JSONB,
  ADD COLUMN IF NOT EXISTS company_linkedin TEXT,
  ADD COLUMN IF NOT EXISTS company_x        TEXT,
  ADD COLUMN IF NOT EXISTS company_instagram TEXT,
  ADD COLUMN IF NOT EXISTS company_facebook TEXT,
  ADD COLUMN IF NOT EXISTS company_youtube  TEXT,
  ADD COLUMN IF NOT EXISTS hq_country       TEXT,
  ADD COLUMN IF NOT EXISTS awards           TEXT,
  ADD COLUMN IF NOT EXISTS certifications   TEXT;

-- GIN index for cheap "founders.*.email = X" or "has socials" admin filters.
CREATE INDEX IF NOT EXISTS submissions_founders_gin_idx
  ON submissions USING GIN (founders);

-- Brief, useful comments so a future reviewer in the Supabase UI gets context.
COMMENT ON COLUMN submissions.founders IS
  'Structured array of founder records. Each: {name, role, email?, mobile?, linkedin?, photo_url?, gender?, is_primary}. First entry with is_primary=true is the submitter.';
COMMENT ON COLUMN submissions.outside_pakistan IS
  'true → use hq_country (ISO country name). false → use hq_city (top-20 PK city) with hq_other for "Other (specify)".';
COMMENT ON COLUMN databank.key_persons IS
  'Mirror of submissions.founders that gets copied on approval. Rendered as the "Key Persons" section on the public detail page.';
