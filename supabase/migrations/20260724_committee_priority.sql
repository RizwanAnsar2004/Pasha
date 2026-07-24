-- Manual display order for committee members (admin_users.priority).
--
-- Until now the public rosters were ordered by member_type alone (Chairman ->
-- Secretariat -> Committee Member), with no way to promote a specific person.
-- This column gives Committee Management an explicit ordering knob: lower
-- number sorts first, and NULL means "unranked" and falls to the bottom.
--
-- Nullable with no default on purpose. A default of 0 would rank every existing
-- row equally and silently reshuffle the current rosters; leaving them NULL
-- keeps today's ordering intact until someone sets a number.
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS priority INTEGER;

COMMENT ON COLUMN admin_users.priority IS
  'Manual roster sort. Lower sorts first; NULL sorts last. Ties fall back to member_type order, then name.';

-- Partial index: only ranked rows are ever ordered by this, and in a table this
-- small it mainly documents the access pattern.
CREATE INDEX IF NOT EXISTS admin_users_priority_idx
  ON admin_users (priority)
  WHERE priority IS NOT NULL;
