-- Closes the gaps left by 20260722_map_option_ids.sql.
--
-- Three real causes (revenue_models / engagement_interests were a false alarm —
-- those rows hold empty arrays, so there is nothing to map):
--
--   1. business_types stores abbreviations ("B2B") while the options hold the
--      long form ("Business to Business (B2B)").
--   2. secondary_industries still holds pre-canonicalization sector names
--      ("Software/SAAS", "Artifical Intelligence (AI)"); only primary_industry
--      was canonicalized earlier.
--   3. nic_name holds real incubators absent from NIC_CENTERS.
--
-- Text columns are still never written — only the parallel id columns.

-- 1. business_types: match on the abbreviation inside the option label --------

UPDATE databank d SET business_types_ids = m.ids
FROM (
  SELECT x.id, array_agg(o.option_id ORDER BY x.ord) AS ids
  FROM (
    SELECT d2.id, btrim(part::text) AS part, ord
    FROM databank d2,
         LATERAL unnest(string_to_array(d2.business_types::text, '|')) WITH ORDINALITY AS t(part, ord)
    WHERE d2.business_types IS NOT NULL AND d2.business_types_ids IS NULL
  ) x
  JOIN options o
    ON o.option_type = 'BUSINESS_MODELS'
   AND (
        lower(o.option_value) = lower(x.part)
     OR lower(o.option_value) LIKE '%(' || lower(x.part) || ')%'
   )
  GROUP BY x.id
) m
WHERE d.id = m.id;

-- 2. secondary_industries: resolve legacy sector spellings -------------------

UPDATE databank d SET secondary_industries_ids = m.ids
FROM (
  SELECT x.id, array_agg(o.option_id ORDER BY x.ord) AS ids
  FROM (
    SELECT d2.id, btrim(part::text) AS part, ord
    FROM databank d2,
         LATERAL unnest(string_to_array(d2.secondary_industries::text, '|')) WITH ORDINALITY AS t(part, ord)
    WHERE d2.secondary_industries IS NOT NULL AND d2.secondary_industries_ids IS NULL
  ) x
  JOIN (
    VALUES
      ('agriculture/agritech','AgriTech'),
      ('biotechnology and life sciences','BioTech'),
      ('blockchain','Blockchain Technology'),
      ('clean-tech/renewable energy/green-tech','CleanTech'),
      ('education/ed-tech','EdTech'),
      ('finance/fin-tech','Fintech'),
      ('health/health-tech','HealthTech'),
      ('mar-tech/marketing/market place','Marketing & AdTech'),
      ('prop-tech/construction','PropTech'),
      ('software/saas','SaaS'),
      ('travel/tourism/hospitality','Travel and Hospitality Tech'),
      ('textile/textile innovation/fashion design','FashionTech'),
      ('supplychain','Mobility & Supply Chain'),
      ('transport/mobility/logistics','Mobility & Supply Chain'),
      ('gaming/an','Gaming and Animation'),
      ('animation/gaming','Gaming and Animation'),
      ('aerospace/avionics/aviation','Aerospace & Aviation'),
      ('food/food-tech','FoodTech'),
      ('media and entertainment','Media & Entertainment'),
      ('sports-tech','SportsTech'),
      ('artifical intelligence (ai)','Artificial Intelligence (AI)'),
      ('internet of things (iot)','Internet of Things (IoT)')
  ) AS alias(from_value, to_value) ON alias.from_value = lower(x.part)
  JOIN options o ON o.option_type = 'SECTORS' AND lower(o.option_value) = lower(alias.to_value)
  GROUP BY x.id
) m
WHERE d.id = m.id;

-- Then the ones that already match an option value directly.
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

-- 3. nic_name: add genuinely-new incubators, then map ------------------------

INSERT INTO options (option_type, option_value, option_label, sort_order)
SELECT DISTINCT 'NIC_CENTERS', btrim(d.nic_name::text), btrim(d.nic_name::text),
       1000 + dense_rank() OVER (ORDER BY btrim(d.nic_name::text))
FROM databank d
WHERE d.nic_name IS NOT NULL
  AND btrim(d.nic_name::text) <> ''
  AND d.nic_name_id IS NULL
ON CONFLICT (option_type, lower(option_value)) DO NOTHING;

UPDATE databank d SET nic_name_id = o.option_id
FROM options o
WHERE o.option_type = 'NIC_CENTERS'
  AND lower(btrim(d.nic_name::text)) = lower(o.option_value)
  AND d.nic_name_id IS NULL;
