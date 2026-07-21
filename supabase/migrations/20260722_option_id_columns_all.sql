-- Parallel id columns for the REMAINING dropdown-backed columns.
-- Additive only: existing text columns are untouched, so the live site is unaffected.
--
-- Single-value dropdowns get a UUID column with a foreign key.
-- Multi-value dropdowns (delimited text or text[]) get a UUID[] column, since one
-- column cannot hold several ids and a FK cannot be placed on an array element.

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS business_model_id             UUID REFERENCES options(option_id);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS revenue_band_id               UUID REFERENCES options(option_id);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS customer_band_id              UUID REFERENCES options(option_id);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS funding_stage_id              UUID REFERENCES options(option_id);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS nic_name_id                   UUID REFERENCES options(option_id);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS founding_team_composition_id  UUID REFERENCES options(option_id);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS founder_gender_id             UUID REFERENCES options(option_id);

ALTER TABLE databank    ADD COLUMN IF NOT EXISTS nic_name_id                   UUID REFERENCES options(option_id);
ALTER TABLE databank    ADD COLUMN IF NOT EXISTS incubation_stage_id           UUID REFERENCES options(option_id);

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS revenue_models_ids            UUID[];
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS engagement_interests_ids      UUID[];

ALTER TABLE databank    ADD COLUMN IF NOT EXISTS business_types_ids            UUID[];
ALTER TABLE databank    ADD COLUMN IF NOT EXISTS secondary_industries_ids      UUID[];

CREATE INDEX IF NOT EXISTS databank_business_types_ids_idx       ON databank USING GIN (business_types_ids);
CREATE INDEX IF NOT EXISTS databank_secondary_industries_ids_idx ON databank USING GIN (secondary_industries_ids);
