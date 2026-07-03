-- Admin-curated awards for databank startups. Each row is one award granted to
-- one startup; surfaced in the homepage "Award-Winning Startups" section.

CREATE TABLE IF NOT EXISTS startup_awards (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  databank_id  UUID        NOT NULL REFERENCES databank(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  year         INT,
  sort_order   INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS startup_awards_databank_idx
  ON startup_awards (databank_id);

CREATE INDEX IF NOT EXISTS startup_awards_order_idx
  ON startup_awards (sort_order, created_at DESC);
