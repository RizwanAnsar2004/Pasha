-- ============================================================
-- PASHA STARTUP DIRECTORY — FULL INITIAL SCHEMA
-- Paste this entire file into: Supabase Dashboard → SQL Editor → Run
-- Then run 20260519_pasha_verified.sql, then 20260521_form_v2.sql
-- ============================================================

-- Enable UUID extension (already on in Supabase, idempotent)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. databank  (public startup directory)
-- ============================================================
CREATE TABLE IF NOT EXISTS databank (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- source tracking
  source                TEXT,                        -- e.g. 'submission', 'ignite', 'manual'
  source_id             UUID,                        -- submissions.id if source='submission'
  source_status         TEXT,                        -- e.g. 'Approved'

  -- identity / branding
  startup_name          TEXT        NOT NULL,
  company_name          TEXT,
  tagline               TEXT,
  logo_url              TEXT,
  website               TEXT,
  founded_date          DATE,

  -- category
  primary_industry      TEXT,
  secondary_industries  TEXT,
  business_types        TEXT,
  product_stage         TEXT,

  -- location
  city                  TEXT,

  -- incubation
  nic_name              TEXT,
  incubation_stage      TEXT,
  cohort                TEXT,
  joining_date          DATE,

  -- team & traction
  total_employees       INTEGER,
  female_employees      INTEGER,
  jobs_created          INTEGER,
  current_revenue       NUMERIC,
  investment_raised     NUMERIC,
  investment_commitment NUMERIC,
  investment_raised_from TEXT,
  number_of_customers   INTEGER,

  -- rich text / pitch
  startup_idea          TEXT,
  business_model        TEXT,
  social_impact         TEXT,
  sdgs                  TEXT,
  video_pitch           TEXT,

  -- recognition
  awards                TEXT,
  certifications        TEXT,

  -- contact (legacy flat — kept for admin outreach tooling)
  contact_person        TEXT,
  contact_email         TEXT,
  outreach_status       TEXT,
  outreach_notes        TEXT,

  -- timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ
);

-- Basic indexes for directory queries
CREATE INDEX IF NOT EXISTS databank_primary_industry_idx ON databank (primary_industry);
CREATE INDEX IF NOT EXISTS databank_city_idx             ON databank (city);
CREATE INDEX IF NOT EXISTS databank_created_at_idx       ON databank (created_at DESC);

-- ============================================================
-- 2. submissions  (public application form → admin moderation)
-- ============================================================
CREATE TABLE IF NOT EXISTS submissions (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- startup
  startup_name             TEXT        NOT NULL,
  tagline                  TEXT,
  website                  TEXT,
  year_founded             TEXT,
  description              TEXT,
  logo_url                 TEXT,

  -- location
  hq_city                  TEXT,
  hq_other                 TEXT,

  -- category
  primary_sector           TEXT,
  secondary_sector         TEXT,
  business_model           TEXT,
  stage                    TEXT,
  revenue_models           JSONB       NOT NULL DEFAULT '[]',

  -- team & legal
  total_employees          INTEGER,
  female_employees         INTEGER,
  total_founders           INTEGER,
  female_founders          INTEGER,
  founding_team_composition TEXT,
  fbr_registered           BOOLEAN,
  secp_registered          BOOLEAN,
  is_pasha_member          BOOLEAN,

  -- traction & funding
  revenue_band             TEXT,
  raised_funding           BOOLEAN,
  funding_stage            TEXT,
  currently_raising        BOOLEAN,
  pitch_deck_url           TEXT,
  pitch_video              TEXT,

  -- incubation
  incubated_in_nic         BOOLEAN,
  nic_name                 TEXT,
  nic_cohort               TEXT,
  nic_year                 TEXT,

  -- recognition
  has_patents              BOOLEAN,
  patents_count            INTEGER,
  engagement_interests     JSONB       NOT NULL DEFAULT '[]',
  whatsapp_optin           BOOLEAN,
  facebook_optin           BOOLEAN,
  closing_notes            TEXT,

  -- legacy flat founder columns (kept for admin backward compat)
  founder_name             TEXT,
  founder_email            TEXT,
  founder_mobile           TEXT,
  founder_linkedin         TEXT,
  founder_photo_url        TEXT,
  founder_gender           TEXT,

  -- vetting (computed on insert)
  vetting_score            INTEGER,
  vetting_tier             TEXT,

  -- audit / spam
  source_ip                TEXT,
  user_agent               TEXT,

  -- moderation
  status                   TEXT        NOT NULL DEFAULT 'pending',
  reviewer_notes           TEXT,
  reviewer_id              UUID,
  reviewed_at              TIMESTAMPTZ,

  -- timestamps
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for admin dashboard queries
CREATE INDEX IF NOT EXISTS submissions_status_idx     ON submissions (status);
CREATE INDEX IF NOT EXISTS submissions_created_at_idx ON submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS submissions_vetting_tier_idx ON submissions (vetting_tier);

-- ============================================================
-- 3. admin_users  (allowlist — managed by super-admin portal)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. audit_log  (immutable trail of all admin actions)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID,
  actor_email   TEXT,
  action        TEXT        NOT NULL,   -- e.g. 'submission.approved', 'databank.update'
  resource_type TEXT,                   -- 'submission' | 'databank'
  resource_id   TEXT,
  payload       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_action_idx      ON audit_log (action);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx  ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_resource_idx    ON audit_log (resource_type, resource_id);

-- ============================================================
-- Row-Level Security
-- Public can read databank. Everything else is deny-all from
-- the public role (app uses service-role key server-side).
-- ============================================================
ALTER TABLE databank    ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log   ENABLE ROW LEVEL SECURITY;

-- databank: anonymous read (powers the public /directory page)
CREATE POLICY IF NOT EXISTS "public_read_databank"
  ON databank FOR SELECT
  TO anon
  USING (true);

-- All other tables: deny anon access (service-role bypasses RLS)
-- No policies needed — default is DENY when RLS is enabled.
