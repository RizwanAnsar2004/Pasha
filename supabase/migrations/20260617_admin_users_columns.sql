-- Extend admin_users with display and audit columns used by committee management.
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS added_at  TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS added_by  TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS notes     TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS org       TEXT NOT NULL DEFAULT '';
