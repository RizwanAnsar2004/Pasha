-- Make `option_lists` the single source of truth for every choice list, and
-- enforce uniqueness at the database level.
--
-- Two kinds of uniqueness are enforced here:
--   1. List NAMES are unique case-insensitively, so "SECTORS" and "sectors"
--      cannot both exist and silently shadow each other at render time.
--   2. The option VALUES inside a single list are unique case-insensitively,
--      so a list can never contain "Fintech" twice (or "Fintech"/"fintech").
--
-- Idempotent. Paste into Supabase Dashboard -> SQL Editor -> Run.

-- ---------------------------------------------------------------------------
-- 1. Case-insensitive unique list names.
-- ---------------------------------------------------------------------------
-- The table already has a plain UNIQUE(name); this additionally blocks
-- case-variant duplicates. Created concurrently-safe via IF NOT EXISTS.
CREATE UNIQUE INDEX IF NOT EXISTS option_lists_name_lower_key
  ON option_lists (lower(name));

-- ---------------------------------------------------------------------------
-- 2. Unique option values within a list.
-- ---------------------------------------------------------------------------
-- `items` accepts both shapes the app normalizes: ["a","b"] and
-- [{"value":"a","label":"A"}]. Pull the effective value out of either, then
-- assert every non-null value is distinct (case-insensitively).
CREATE OR REPLACE FUNCTION option_list_items_unique(items jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN items IS NULL THEN false
    WHEN jsonb_typeof(items) <> 'array' THEN false
    ELSE (
      SELECT count(*) = count(DISTINCT lower(t.v))
      FROM (
        SELECT CASE
                 WHEN jsonb_typeof(e) = 'string' THEN e #>> '{}'
                 WHEN jsonb_typeof(e) = 'object' THEN e ->> 'value'
                 ELSE NULL
               END AS v
        FROM jsonb_array_elements(items) AS e
      ) t
      WHERE t.v IS NOT NULL AND btrim(t.v) <> ''
    )
  END;
$$;

COMMENT ON FUNCTION option_list_items_unique(jsonb) IS
  'True when every option value in the list is present at most once (case-insensitive). Backs the option_lists_items_unique CHECK constraint.';

-- Add the CHECK only if it is not already present (ALTER ... ADD CONSTRAINT has
-- no IF NOT EXISTS form).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'option_lists'::regclass
      AND conname  = 'option_lists_items_unique'
  ) THEN
    ALTER TABLE option_lists
      ADD CONSTRAINT option_lists_items_unique
      CHECK (option_list_items_unique(items));
  END IF;
END
$$;

COMMENT ON TABLE option_lists IS
  'Single source of truth for reusable choice lists (sectors, cities, stages, ...). Seeded from src/lib/options.ts by scripts/seed-option-lists.ts; the code lists remain only as an offline fallback. Names and in-list values are unique case-insensitively.';
