-- Normalised options table — one row per option, replacing the JSONB blob in
-- option_lists.items.
--
-- WHY: option_lists stores a whole list as one JSONB array, so an individual
-- option has no identity. That is how "SaaS" and "Software/SAAS" could both
-- exist as separate, unrelated strings, and why renaming a sector meant
-- rewriting every databank row that used it (1,660 rows in the last cleanup).
--
-- With one row per option:
--   • option_value  is the stable key data points at — never changes
--   • option_label  is what users see — editable freely, zero data rewrites
--   • is_active     hides a retired option without deleting history
--   • sort_order    preserves meaningful ordering (stages run earliest→latest,
--                   "Other" stays last) — a plain SELECT has no inherent order
--
-- The UNIQUE (option_type, lower(option_value)) constraint is the part that
-- actually stops the duplicate problem recurring.
--
-- Idempotent. Paste into Supabase Dashboard -> SQL Editor -> Run.

CREATE TABLE IF NOT EXISTS options (
  -- UUID rather than a sequential integer: if this table is ever rebuilt in a
  -- fresh environment, sequential ids restart at 1 and a stale link like
  -- ?sector=7 would silently resolve to a DIFFERENT sector. A regenerated UUID
  -- simply won't match, so the link fails loudly instead of lying.
  option_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_type  TEXT    NOT NULL,           -- which list: 'SECTORS', 'STAGES', …
  option_value TEXT    NOT NULL,           -- stable key stored by other tables
  option_label TEXT    NOT NULL,           -- display text, safe to edit anytime
  sort_order   INT     NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE options IS
  'Single source of truth for every choice list. One row per option. option_value is the stable key; option_label is display-only and may be edited without touching referencing data.';

-- No two options of the same type may share a value, case-insensitively.
CREATE UNIQUE INDEX IF NOT EXISTS options_type_value_key
  ON options (option_type, lower(option_value));

-- Two different orderings, deliberately kept apart:
--
--   Public dropdowns  → sort_order. Order carries meaning (stages run
--                       earliest→latest, "Other" stays last), so a newly added
--                       option must slot into sequence, not jump to the top.
--   Admin management  → created_at DESC, newest first, so a just-added option
--                       is immediately visible without hunting for it.
CREATE INDEX IF NOT EXISTS options_type_active_idx
  ON options (option_type, is_active, sort_order);

CREATE INDEX IF NOT EXISTS options_type_created_idx
  ON options (option_type, created_at DESC);

ALTER TABLE options ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Backfill from the existing option_lists JSONB, preserving array order as
-- sort_order. Safe to re-run: ON CONFLICT leaves existing rows untouched, so
-- any label edits made after the first run are not clobbered.
-- ---------------------------------------------------------------------------
INSERT INTO options (option_type, option_value, option_label, sort_order)
SELECT
  l.name,
  COALESCE(item ->> 'value', item #>> '{}'),
  COALESCE(item ->> 'label', item ->> 'value', item #>> '{}'),
  ord - 1
FROM option_lists l
CROSS JOIN LATERAL jsonb_array_elements(l.items) WITH ORDINALITY AS t(item, ord)
WHERE COALESCE(item ->> 'value', item #>> '{}') IS NOT NULL
  AND btrim(COALESCE(item ->> 'value', item #>> '{}')) <> ''
ON CONFLICT (option_type, lower(option_value)) DO NOTHING;
