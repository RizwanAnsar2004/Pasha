-- Committee activity timeline entries shown on the public site.
CREATE TABLE IF NOT EXISTS committee_activities (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL,
  type          TEXT        NOT NULL CHECK (type IN (
                  'verification', 'report', 'program', 'event', 'update', 'initiative'
                )),
  description   TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),
  author_email  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS committee_activities_created_at_idx
  ON committee_activities (created_at DESC);
