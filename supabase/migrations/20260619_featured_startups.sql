-- Admin-managed featured startups with time-bounded visibility (no slot limit).

CREATE TABLE IF NOT EXISTS featured_startups (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  databank_id     UUID        NOT NULL REFERENCES databank(id) ON DELETE CASCADE,
  featured_from   TIMESTAMPTZ NOT NULL DEFAULT now(),
  featured_until  TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ,
  UNIQUE (databank_id)
);

CREATE INDEX IF NOT EXISTS featured_startups_active_idx
  ON featured_startups (featured_from, featured_until);

CREATE TABLE IF NOT EXISTS featured_startup_settings (
  id                  BOOLEAN     PRIMARY KEY DEFAULT true CHECK (id = true),
  auto_rotate         BOOLEAN     NOT NULL DEFAULT true,
  show_on_homepage    BOOLEAN     NOT NULL DEFAULT true,
  show_on_directory   BOOLEAN     NOT NULL DEFAULT true,
  show_in_search      BOOLEAN     NOT NULL DEFAULT false,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO featured_startup_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;
