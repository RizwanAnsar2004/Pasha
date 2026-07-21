-- submissions.stage is a Postgres ENUM (startup_stage) pinned to the retired
-- coded vocabulary: ideation / dev_launch / early / growth.
--
-- WHY THIS IS URGENT: the apply form now offers the current STAGES values
-- ("Series A", "MVP/Prototype", …). Inserting any of them into an enum column
-- that doesn't declare them fails outright:
--     invalid input value for enum startup_stage: "MVP/Prototype"
-- so every new application would error on submit until this runs.
--
-- An enum is also the wrong constraint now that the stage list is admin-editable
-- at /admin/option-lists — adding a stage there would silently re-break inserts.
-- Converting to TEXT keeps the DB out of the business of policing a list the
-- admin owns; the app already validates against the option_lists registry.
--
-- The enum type itself was never defined in this repo (created directly in
-- Supabase), so it is left in place rather than dropped blind — see the end.
--
-- Idempotent. Paste into Supabase Dashboard -> SQL Editor -> Run.

DO $$
BEGIN
  -- Only act while the column is still the enum type.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'submissions'
      AND column_name = 'stage'
      AND data_type = 'USER-DEFINED'
  ) THEN
    -- A DEFAULT typed as the enum would block the ALTER; drop it first.
    ALTER TABLE submissions ALTER COLUMN stage DROP DEFAULT;
    ALTER TABLE submissions ALTER COLUMN stage TYPE text USING stage::text;
  END IF;
END
$$;

-- Map the retired codes onto the current STAGES vocabulary, preserving the
-- lifecycle meaning of each old label. Safe to re-run: matches nothing once done.
UPDATE submissions SET stage = 'Ideation'              WHERE stage = 'ideation';
UPDATE submissions SET stage = 'MVP/Prototype'         WHERE stage = 'dev_launch';
UPDATE submissions SET stage = 'Production/market fit' WHERE stage = 'early';
UPDATE submissions SET stage = 'Growth (Series B,C)'   WHERE stage = 'growth';

-- Once you've confirmed no other table or view references the type:
--   DROP TYPE IF EXISTS startup_stage;
