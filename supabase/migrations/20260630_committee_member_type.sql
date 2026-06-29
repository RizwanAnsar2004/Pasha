-- Add an explicit member type to committee management (admin_users).
-- The existing free-text role (notes) is unchanged; this is a separate field.
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS member_type TEXT NOT NULL DEFAULT 'member';
-- allowed: 'chairman' | 'member' | 'admin'
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_member_type_chk;
ALTER TABLE admin_users
  ADD CONSTRAINT admin_users_member_type_chk
  CHECK (member_type IN ('chairman','member','admin'));

-- Existing committee members predate this column — treat them as full admins
-- so current users retain operation access. New rows default to 'member'.
UPDATE admin_users SET member_type = 'admin' WHERE member_type = 'member';

-- Explicit display name for committee members (was previously derived from the
-- email local-part). Optional; the public page falls back to the derived name.
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS name TEXT;

-- Track last add/edit so the management list can surface recently touched rows
-- at the top. Seed every existing row from added_at so the initial sort matches
-- insertion recency (the column default is now(), which would tie all rows).
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
UPDATE admin_users SET updated_at = added_at;
