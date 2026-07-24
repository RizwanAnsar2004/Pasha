-- Add 'secretariat' to the committee member types (admin_users.member_type).
--
-- The P@SHA Secretariat is a distinct body from the Committee: it appears on
-- the public rosters under its own tag, but carries no admin privileges — the
-- management gate stays 'admin' | 'chairman' (see the membership check in
-- src/app/api/admin/committee-members/route.ts and the canManage helper in
-- src/app/admin/(authed)/committee-management/page.tsx).
--
-- Widening a CHECK constraint only; no rows are rewritten and no existing
-- member_type value changes, so this is safe to run against live data and
-- safe to re-run.
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_member_type_chk;
-- allowed: 'chairman' | 'member' | 'secretariat' | 'admin'
ALTER TABLE admin_users
  ADD CONSTRAINT admin_users_member_type_chk
  CHECK (member_type IN ('chairman','member','secretariat','admin'));
