-- Per-startup "profile/data status" on the databank row, tracking the
-- request-info lifecycle so admins can see who's been asked for info and who
-- has responded:
--   none           — default, nothing outstanding (shown as no badge)
--   info_requested — admin asked the startup to fill/correct data
--   updated        — the startup submitted the requested info (flag for review)
--
-- Default is 'none' (not "complete") so a full list of startups isn't
-- misleadingly labelled as complete.
--
-- Idempotent. Run on BOTH dev and prod. (Run 20260728_edit_requests.sql first
-- for the back-fill to mark existing pending requests.)

ALTER TABLE databank ADD COLUMN IF NOT EXISTS data_status TEXT NOT NULL DEFAULT 'none';

CREATE INDEX IF NOT EXISTS databank_data_status_idx ON databank (data_status);

-- Back-fill: mark rows that already have an open (pending) edit request.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'edit_requests') THEN
    UPDATE databank d
    SET data_status = 'info_requested'
    WHERE d.data_status = 'none'
      AND EXISTS (
        SELECT 1 FROM edit_requests er WHERE er.databank_id = d.id AND er.status = 'pending'
      );
  END IF;
END $$;
