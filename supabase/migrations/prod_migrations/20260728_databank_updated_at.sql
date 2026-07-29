-- The databank report's merged date filter (and its "Last updated" column) read
-- databank.updated_at, but the live table predates that column: the base
-- CREATE TABLE IF NOT EXISTS only ran once, before updated_at was added to the
-- schema file, so it was never actually created on this database.
--
-- Add it idempotently and seed existing rows to their created_at so the "added
-- or updated" filter and the report column have values. Going forward the
-- approve / edit-request resync (publishSubmissionToDatabank) stamps updated_at.
--
-- Idempotent. Run on BOTH dev and prod.

ALTER TABLE databank ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE databank SET updated_at = created_at WHERE updated_at IS NULL;
