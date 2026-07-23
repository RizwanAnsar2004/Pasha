-- Optional headshot for committee members, set from Admin → Committee
-- Management and shown on the public /committee and /about rosters.
-- Nullable: members without a photo keep falling back to their initials.

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS photo_url text;
