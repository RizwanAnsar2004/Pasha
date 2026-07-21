-- Fill the parallel *_id / *_ids columns entirely inside Postgres.
--
-- The TypeScript mapper issued one HTTP UPDATE per row (~6,500 round-trips).
-- These are set-based: one statement per column, each atomic, whole thing in
-- seconds. Only the new id columns are written — the text columns the live site
-- reads are never touched.
--
-- Idempotent: every statement skips rows already mapped.

-- Single-value columns ------------------------------------------------------

UPDATE databank d SET primary_industry_id = o.option_id
FROM options o
WHERE o.option_type = 'SECTORS'
  AND lower(btrim(d.primary_industry::text)) = lower(o.option_value)
  AND d.primary_industry_id IS NULL;

UPDATE databank d SET product_stage_id = o.option_id
FROM options o
WHERE o.option_type = 'STAGES'
  AND lower(btrim(d.product_stage::text)) = lower(o.option_value)
  AND d.product_stage_id IS NULL;

UPDATE databank d SET city_id = o.option_id
FROM options o
WHERE o.option_type = 'HQ_CITIES'
  AND lower(btrim(d.city::text)) = lower(o.option_value)
  AND d.city_id IS NULL;

UPDATE databank d SET nic_name_id = o.option_id
FROM options o
WHERE o.option_type = 'NIC_CENTERS'
  AND lower(btrim(d.nic_name::text)) = lower(o.option_value)
  AND d.nic_name_id IS NULL;

UPDATE databank d SET hq_country_id = c.country_id
FROM countries c
WHERE lower(btrim(d.hq_country::text)) = lower(c.country_name)
  AND d.hq_country_id IS NULL;

UPDATE submissions s SET primary_sector_id = o.option_id
FROM options o
WHERE o.option_type = 'SECTORS'
  AND lower(btrim(s.primary_sector::text)) = lower(o.option_value)
  AND s.primary_sector_id IS NULL;

UPDATE submissions s SET stage_id = o.option_id
FROM options o
WHERE o.option_type = 'STAGES'
  AND lower(btrim(s.stage::text)) = lower(o.option_value)
  AND s.stage_id IS NULL;

UPDATE submissions s SET hq_city_id = o.option_id
FROM options o
WHERE o.option_type = 'HQ_CITIES'
  AND lower(btrim(s.hq_city::text)) = lower(o.option_value)
  AND s.hq_city_id IS NULL;

UPDATE submissions s SET hq_country_id = c.country_id
FROM countries c
WHERE lower(btrim(s.hq_country::text)) = lower(c.country_name)
  AND s.hq_country_id IS NULL;

UPDATE submissions s SET business_model_id = o.option_id
FROM options o
WHERE o.option_type = 'BUSINESS_MODELS'
  AND lower(btrim(s.business_model::text)) = lower(o.option_value)
  AND s.business_model_id IS NULL;

UPDATE submissions s SET revenue_band_id = o.option_id
FROM options o
WHERE o.option_type = 'REVENUE_BANDS'
  AND lower(btrim(s.revenue_band::text)) = lower(o.option_value)
  AND s.revenue_band_id IS NULL;

UPDATE submissions s SET customer_band_id = o.option_id
FROM options o
WHERE o.option_type = 'CUSTOMER_BANDS'
  AND lower(btrim(s.customer_band::text)) = lower(o.option_value)
  AND s.customer_band_id IS NULL;

UPDATE submissions s SET funding_stage_id = o.option_id
FROM options o
WHERE o.option_type = 'FUNDING_STAGES'
  AND lower(btrim(s.funding_stage::text)) = lower(o.option_value)
  AND s.funding_stage_id IS NULL;

UPDATE submissions s SET nic_name_id = o.option_id
FROM options o
WHERE o.option_type = 'NIC_CENTERS'
  AND lower(btrim(s.nic_name::text)) = lower(o.option_value)
  AND s.nic_name_id IS NULL;

UPDATE submissions s SET founding_team_composition_id = o.option_id
FROM options o
WHERE o.option_type = 'FOUNDING_TEAM_COMPOSITIONS'
  AND lower(btrim(s.founding_team_composition::text)) = lower(o.option_value)
  AND s.founding_team_composition_id IS NULL;

UPDATE submissions s SET founder_gender_id = o.option_id
FROM options o
WHERE o.option_type = 'FOUNDER_GENDERS'
  AND lower(btrim(s.founder_gender::text)) = lower(o.option_value)
  AND s.founder_gender_id IS NULL;

-- Multi-value columns -------------------------------------------------------
-- Split the delimited text / array, resolve each part, aggregate back to uuid[].
-- Rows whose parts resolve to nothing are left NULL rather than an empty array.

UPDATE databank d SET business_types_ids = m.ids
FROM (
  SELECT x.id, array_agg(o.option_id ORDER BY x.ord) AS ids
  FROM (
    SELECT d2.id, btrim(part::text) AS part, ord
    FROM databank d2,
         LATERAL unnest(string_to_array(d2.business_types::text, '|')) WITH ORDINALITY AS t(part, ord)
    WHERE d2.business_types IS NOT NULL AND d2.business_types_ids IS NULL
  ) x
  JOIN options o ON o.option_type = 'BUSINESS_MODELS' AND lower(o.option_value) = lower(x.part)
  GROUP BY x.id
) m
WHERE d.id = m.id;

UPDATE databank d SET secondary_industries_ids = m.ids
FROM (
  SELECT x.id, array_agg(o.option_id ORDER BY x.ord) AS ids
  FROM (
    SELECT d2.id, btrim(part::text) AS part, ord
    FROM databank d2,
         LATERAL unnest(string_to_array(d2.secondary_industries::text, '|')) WITH ORDINALITY AS t(part, ord)
    WHERE d2.secondary_industries IS NOT NULL AND d2.secondary_industries_ids IS NULL
  ) x
  JOIN options o ON o.option_type = 'SECTORS' AND lower(o.option_value) = lower(x.part)
  GROUP BY x.id
) m
WHERE d.id = m.id;

UPDATE submissions s SET revenue_models_ids = m.ids
FROM (
  SELECT x.id, array_agg(o.option_id ORDER BY x.ord) AS ids
  FROM (
    SELECT s2.id, btrim(part::text) AS part, ord
    FROM submissions s2,
         LATERAL unnest(s2.revenue_models) WITH ORDINALITY AS t(part, ord)
    WHERE s2.revenue_models IS NOT NULL AND s2.revenue_models_ids IS NULL
  ) x
  JOIN options o ON o.option_type = 'REVENUE_MODELS' AND lower(o.option_value) = lower(x.part)
  GROUP BY x.id
) m
WHERE s.id = m.id;

UPDATE submissions s SET engagement_interests_ids = m.ids
FROM (
  SELECT x.id, array_agg(o.option_id ORDER BY x.ord) AS ids
  FROM (
    SELECT s2.id, btrim(part::text) AS part, ord
    FROM submissions s2,
         LATERAL unnest(s2.engagement_interests) WITH ORDINALITY AS t(part, ord)
    WHERE s2.engagement_interests IS NOT NULL AND s2.engagement_interests_ids IS NULL
  ) x
  JOIN options o ON o.option_type = 'ENGAGEMENT_INTERESTS' AND lower(o.option_value) = lower(x.part)
  GROUP BY x.id
) m
WHERE s.id = m.id;
