-- Admin-managed email templates.
--
-- Reusable HTML email templates the admin side can edit. Each template has a
-- stable human key (template_id) used by senders to look it up, an HTML body,
-- and a placeholders bag mapping {{key}} tokens to a sample/default value so
-- the editor can document and preview substitutions.
--
-- Idempotent. Paste into Supabase Dashboard → SQL Editor → Run.

CREATE TABLE IF NOT EXISTS email_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   TEXT NOT NULL,                       -- stable lookup key, e.g. 'welcome_email'
  name          TEXT NOT NULL DEFAULT '',            -- friendly label for admins
  subject       TEXT NOT NULL DEFAULT '',
  body          TEXT NOT NULL DEFAULT '',            -- HTML
  placeholders  JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { "{{first_name}}": "Recipient first name", ... }
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'active', 'archived')),
  is_default    BOOLEAN NOT NULL DEFAULT false,     -- protected: cannot be deleted
  description   TEXT NOT NULL DEFAULT '',
  author_email  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ
);

-- One row per logical template key.
CREATE UNIQUE INDEX IF NOT EXISTS email_templates_template_id_key ON email_templates (template_id);
CREATE INDEX IF NOT EXISTS email_templates_status_idx ON email_templates (status);
CREATE INDEX IF NOT EXISTS email_templates_created_at_idx ON email_templates (created_at DESC);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE email_templates IS 'Admin-managed reusable HTML email templates.';
COMMENT ON COLUMN email_templates.template_id IS 'Stable lookup key (slug) used by senders to fetch the template.';
COMMENT ON COLUMN email_templates.body IS 'HTML email body. May contain {{placeholder}} tokens.';
COMMENT ON COLUMN email_templates.placeholders IS 'Object mapping placeholder token -> sample/default value (key against value).';
COMMENT ON COLUMN email_templates.status IS 'draft = editing, active = usable by senders, archived = retired.';
COMMENT ON COLUMN email_templates.is_default IS 'Protected system template — cannot be deleted (enforced in the API).';

-- Belt-and-suspenders: block deletes of default templates at the DB level too.
CREATE OR REPLACE FUNCTION prevent_default_email_template_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_default THEN
    RAISE EXCEPTION 'Default email templates cannot be deleted';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_templates_protect_default ON email_templates;
CREATE TRIGGER email_templates_protect_default
  BEFORE DELETE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION prevent_default_email_template_delete();
