-- Spec §13 — startup badges on the public directory.
--
-- Verified (databank.pasha_verified) and Featured (featured_startups) already
-- exist. This adds the remaining CTA badge flags to the directory row so cards
-- and the detail page can render them. They are populated on approval from the
-- submission (women_led / currently_hiring live in submissions.answers;
-- currently_raising is a real submissions column) — see
-- src/app/api/admin/submission/route.ts.
--
-- Idempotent. Paste into Supabase Dashboard → SQL Editor → Run.

ALTER TABLE databank
  ADD COLUMN IF NOT EXISTS women_led   BOOLEAN,
  ADD COLUMN IF NOT EXISTS hiring      BOOLEAN,
  ADD COLUMN IF NOT EXISTS fundraising BOOLEAN;

COMMENT ON COLUMN databank.women_led IS
  'Women-led badge — opt-in (spec §9). Set from the submission on approval.';
COMMENT ON COLUMN databank.hiring IS
  'Hiring badge — startup is currently hiring. Set from the submission on approval.';
COMMENT ON COLUMN databank.fundraising IS
  'Fundraising badge — startup is currently raising. Set from the submission on approval.';
