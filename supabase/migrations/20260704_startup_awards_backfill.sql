-- One-time backfill: turn each existing databank.awards text line into a
-- structured startup_awards row so pre-existing award data survives the switch
-- to the curated table and becomes editable in the admin Awards tab.
--
-- Mirrors the homepage's client-side filtering: split on newlines, trim, drop
-- blanks and the "junk" placeholders (none / n/a / dashes / bare URLs). A
-- trailing 4-digit year in the line is lifted into the `year` column.
--
-- Idempotent: only inserts for startups that have no startup_awards rows yet,
-- so re-running never duplicates.

INSERT INTO startup_awards (databank_id, title, year, sort_order)
SELECT
  d.id,
  -- Strip a trailing "(2024)" / " 2024" year off the title if present.
  regexp_replace(trim(line), '\s*[\(\-–—]?\s*(19|20)\d{2}\)?\s*$', '') AS title,
  NULLIF(substring(trim(line) FROM '(19|20)\d{2}'), '')::int AS year,
  (ord - 1) AS sort_order
FROM databank d
CROSS JOIN LATERAL unnest(string_to_array(d.awards, E'\n')) WITH ORDINALITY AS t(line, ord)
WHERE d.awards IS NOT NULL
  AND trim(line) <> ''
  AND lower(trim(line)) !~ '^(none|n/a|no formal)'
  AND trim(line) !~ '^-+$'
  AND trim(line) !~* '^https?://'
  -- keep something meaningful after stripping the year
  AND length(regexp_replace(trim(line), '\s*[\(\-–—]?\s*(19|20)\d{2}\)?\s*$', '')) > 1
  AND NOT EXISTS (
    SELECT 1 FROM startup_awards sa WHERE sa.databank_id = d.id
  );
