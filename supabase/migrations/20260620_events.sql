-- Admin-managed events (webinars & seminars) with rich detail content.

CREATE TABLE IF NOT EXISTS events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  summary             TEXT NOT NULL DEFAULT '',
  about               TEXT NOT NULL DEFAULT '',
  event_type          TEXT NOT NULL DEFAULT 'seminar'
                      CHECK (event_type IN ('webinar', 'seminar')),
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'published')),
  registration_status TEXT NOT NULL DEFAULT 'open'
                      CHECK (registration_status IN ('open', 'closed')),
  event_date          DATE NOT NULL,
  start_time          TEXT NOT NULL DEFAULT '09:00',
  end_time            TEXT NOT NULL DEFAULT '17:00',
  timezone            TEXT NOT NULL DEFAULT 'PKT',
  venue               TEXT NOT NULL DEFAULT '',
  location            TEXT NOT NULL DEFAULT '',
  format              TEXT NOT NULL DEFAULT 'in_person'
                      CHECK (format IN ('in_person', 'online')),
  organizer           TEXT NOT NULL DEFAULT 'PASHA Committee',
  expected_attendees  TEXT NOT NULL DEFAULT '',
  capacity            INTEGER,
  capacity_note       TEXT NOT NULL DEFAULT '',
  entry_type          TEXT NOT NULL DEFAULT 'free'
                      CHECK (entry_type IN ('free', 'paid')),
  registration_url    TEXT,
  audience_items      JSONB NOT NULL DEFAULT '[]'::jsonb,
  agenda_items        JSONB NOT NULL DEFAULT '[]'::jsonb,
  speakers            JSONB NOT NULL DEFAULT '[]'::jsonb,
  partners            JSONB NOT NULL DEFAULT '[]'::jsonb,
  author_email        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS events_event_date_idx ON events (event_date DESC);
CREATE INDEX IF NOT EXISTS events_status_idx ON events (status);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE events IS 'PSEC events — webinars and seminars managed by admins.';
COMMENT ON COLUMN events.audience_items IS 'Array of {title, subtitle} for Who Should Attend.';
COMMENT ON COLUMN events.agenda_items IS 'Array of {time, title, tag} for the agenda.';
COMMENT ON COLUMN events.speakers IS 'Array of {name, role, topic} for featured speakers.';
COMMENT ON COLUMN events.partners IS 'Array of partner name strings.';
