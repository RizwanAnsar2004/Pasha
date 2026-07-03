-- Tag where each award came from so the auto-sync (approval / Data Bank edit)
-- can refresh submission-derived awards without touching admin-added extras.
--   'submission' → mirrored from databank.awards text (managed by sync)
--   'manual'     → added by an admin in the Awards tab (never auto-removed)

ALTER TABLE startup_awards
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

-- Existing rows (backfill + anything already curated) stay 'manual' so the
-- sync never auto-removes them. Only awards created by future approvals /
-- Data Bank edits are tagged 'submission' and managed by the sync.
