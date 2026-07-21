-- DB-side DISTINCT for the option-list seeder.
--
-- The seeder used to pull every databank row into Node just to work out which
-- sectors/cities/stages exist. That transferred thousands of rows to compute a
-- ~50-row answer, and silently truncated at PostgREST's 1000-row cap — which is
-- how 15 sectors went missing from the Sector filter.
--
-- This does the DISTINCT where the data lives: one round-trip, one row per
-- value, no cap to trip over.
--
-- The column name is whitelisted rather than interpolated freely, so this cannot
-- be turned into arbitrary SQL by a caller.
--
-- Idempotent. Paste into Supabase Dashboard -> SQL Editor -> Run.

CREATE OR REPLACE FUNCTION distinct_databank_values(col text)
RETURNS TABLE(value text, count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF col NOT IN ('primary_industry', 'city', 'product_stage', 'business_types') THEN
    RAISE EXCEPTION 'distinct_databank_values: column % is not allowed', col;
  END IF;

  RETURN QUERY EXECUTE format(
    'SELECT %I::text AS value, count(*)::bigint AS count
       FROM databank
      WHERE %I IS NOT NULL
        AND btrim(%I::text) <> %L
        AND upper(btrim(%I::text)) NOT IN (%L, %L, %L, %L)
      GROUP BY %I
      ORDER BY count(*) DESC',
    col, col, col, '', col, 'NULL', 'N/A', 'NA', 'NONE', col
  );
END;
$$;

COMMENT ON FUNCTION distinct_databank_values(text) IS
  'Distinct non-empty values of a whitelisted databank column, with row counts. Used by scripts/seed-option-lists.ts so the seeder never pages the whole table.';

REVOKE ALL ON FUNCTION distinct_databank_values(text) FROM PUBLIC, anon, authenticated;
