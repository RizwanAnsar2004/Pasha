-- Self-service company profile claim by email verification code.
--
-- Minimal model: the verified email becomes the profile's owner/company email.
-- No domain gate — any email can claim, ownership is proven by the 6-digit code.

ALTER TABLE databank ADD COLUMN IF NOT EXISTS claimed_by       UUID;
ALTER TABLE databank ADD COLUMN IF NOT EXISTS claimed_email    TEXT;
ALTER TABLE databank ADD COLUMN IF NOT EXISTS claimed_at       TIMESTAMPTZ;
ALTER TABLE databank ADD COLUMN IF NOT EXISTS verified_claimed BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS company_claims (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  databank_id  UUID NOT NULL REFERENCES databank(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  code         TEXT NOT NULL,                 -- 6-digit verification code
  expires_at   TIMESTAMPTZ NOT NULL,          -- 10 minutes from issue
  attempts     INT NOT NULL DEFAULT 0,        -- wrong-code tries, capped
  consumed_at  TIMESTAMPTZ,                   -- set once verified
  ip           TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_claims_lookup_idx
  ON company_claims (databank_id, email, consumed_at);

ALTER TABLE company_claims ENABLE ROW LEVEL SECURITY;
