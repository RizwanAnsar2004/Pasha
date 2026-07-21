-- Parallel id columns so the data can be mapped BEFORE the code is deployed.
--
-- The live site reads the existing text columns from this same database. Adding
-- new columns leaves those untouched, so mapping is invisible to production and
-- can be verified at leisure. The text column is dropped only after the
-- id-reading code is live (see deploy/OPTION-IDS-CUTOVER.md).

ALTER TABLE databank    ADD COLUMN IF NOT EXISTS primary_industry_id UUID REFERENCES options(option_id);
ALTER TABLE databank    ADD COLUMN IF NOT EXISTS product_stage_id    UUID REFERENCES options(option_id);
ALTER TABLE databank    ADD COLUMN IF NOT EXISTS city_id             UUID REFERENCES options(option_id);
ALTER TABLE databank    ADD COLUMN IF NOT EXISTS hq_country_id       UUID REFERENCES countries(country_id);

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS primary_sector_id   UUID REFERENCES options(option_id);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS stage_id            UUID REFERENCES options(option_id);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS hq_city_id          UUID REFERENCES options(option_id);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS hq_country_id       UUID REFERENCES countries(country_id);

CREATE INDEX IF NOT EXISTS databank_primary_industry_id_idx ON databank (primary_industry_id);
CREATE INDEX IF NOT EXISTS databank_product_stage_id_idx    ON databank (product_stage_id);
CREATE INDEX IF NOT EXISTS databank_city_id_idx             ON databank (city_id);
