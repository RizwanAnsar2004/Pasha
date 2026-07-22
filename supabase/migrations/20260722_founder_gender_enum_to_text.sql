-- submissions.founder_gender is a Postgres ENUM (founder_gender) pinned to a
-- fixed vocabulary: male / female / non_binary / prefer_not_to_say.
--
-- WHY: the founder gender list is admin-editable at /admin/option-lists and is
-- now served from the options registry, so the apply form submits an option id:
--     invalid input value for enum founder_gender: "76ccb305-01f0-4e7e-…"
--
-- The application layer now resolves ids back to their underlying value before
-- insert (see resolveOptionValue in src/lib/options/resolve.ts), which fixes
-- the id case on its own. This migration addresses the SECOND half of the
-- problem: the moment an admin adds a new gender option, its value will not
-- exist in the enum and inserts break again — exactly how the startup_stage
-- enum failed (see 20260721_stage_enum_to_text.sql).
--
-- An enum is the wrong constraint for a list the admin owns. The app already
-- validates against the option_lists registry.
--
-- The enum type itself was never defined in this repo (created directly in
-- Supabase), so it is left in place rather than dropped blind — see the end.
--
-- Every statement is guarded on the column actually existing, so this runs
-- cleanly whether or not a given table carries founder_gender / key_persons.
-- Idempotent. Paste into Supabase Dashboard -> SQL Editor -> Run.

-- 1. submissions.founder_gender: enum -> text.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'submissions'
      AND column_name = 'founder_gender'
      AND data_type = 'USER-DEFINED'
  ) THEN
    -- A DEFAULT typed as the enum would block the ALTER; drop it first.
    ALTER TABLE submissions ALTER COLUMN founder_gender DROP DEFAULT;
    ALTER TABLE submissions ALTER COLUMN founder_gender TYPE text USING founder_gender::text;
  END IF;
END
$$;

-- 2. Repair scalar founder_gender values already written as an option id.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'founder_gender'
  ) THEN
    UPDATE submissions s
    SET founder_gender = o.option_value
    FROM options o
    WHERE o.option_type = 'FOUNDER_GENDERS'
      AND s.founder_gender = o.option_id::text;
  END IF;
END
$$;

-- 3. Same repair inside JSONB arrays of people, where each element may carry an
-- id-valued `gender`. submissions.founders and databank.key_persons both feed
-- women-led detection. Rewrites only elements that match a known option.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('submissions', 'founders'),
      ('databank',    'key_persons')
    ) AS v(tbl, col)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = t.tbl AND column_name = t.col
    ) THEN
      EXECUTE format($f$
        UPDATE %1$I tgt
        SET %2$I = sub.fixed
        FROM (
          SELECT
            src.id,
            jsonb_agg(
              CASE
                WHEN o.option_value IS NOT NULL
                  THEN jsonb_set(elem, '{gender}', to_jsonb(o.option_value))
                ELSE elem
              END
              ORDER BY ord
            ) AS fixed
          FROM %1$I src
          CROSS JOIN LATERAL jsonb_array_elements(src.%2$I) WITH ORDINALITY AS e(elem, ord)
          LEFT JOIN options o
            ON o.option_type = 'FOUNDER_GENDERS'
           AND o.option_id::text = (elem ->> 'gender')
          WHERE jsonb_typeof(src.%2$I) = 'array'
          GROUP BY src.id
        ) AS sub
        WHERE tgt.id = sub.id
          AND tgt.%2$I IS DISTINCT FROM sub.fixed
      $f$, t.tbl, t.col);
    END IF;
  END LOOP;
END
$$;

-- Once you've confirmed no other table or view references the type:
--   DROP TYPE IF EXISTS founder_gender;
