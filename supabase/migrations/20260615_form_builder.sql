-- Form Builder: makes the public apply form admin-configurable.
--
-- Adds two config tables (form_sections, form_fields) that describe the form's
-- structure — sections (steps), the fields in each, their input types
-- (int-based enum), validations, options, and repeatable subsections (groups).
-- The renderer + a runtime Zod schema are built from these rows.
--
-- A new submissions.answers JSONB column captures any field/group that has no
-- column_map (i.e. admin-added fields). Existing first-class columns are left
-- untouched, so existing rows, the vetting score, and the public databank keep
-- working unchanged. Seeded fields carry a column_map back to their current
-- column so core data still lands where vetting/databank expect it.
--
-- Idempotent. Paste into Supabase Dashboard → SQL Editor → Run.

-- ===== form_sections — top-level steps / pages of the form =====
CREATE TABLE IF NOT EXISTS form_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  subtitle    TEXT,
  step        INTEGER NOT NULL DEFAULT 1,   -- which wizard step this renders on
  sort_order  INTEGER NOT NULL DEFAULT 0,   -- order within its step
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== form_fields — recursive: scalar fields AND group/subsection nodes =====
-- A row with input_type = 20 (GROUP) is a subsection; its children are the
-- form_fields whose parent_field_id points at it. Groups can nest arbitrarily.
-- A repeatable group (repeatable=true) collects an array of item objects — the
-- general form of the founders repeater ("3 members data").
CREATE TABLE IF NOT EXISTS form_fields (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id       UUID NOT NULL REFERENCES form_sections(id) ON DELETE CASCADE,
  parent_field_id  UUID REFERENCES form_fields(id) ON DELETE CASCADE,  -- null = directly under section
  field_key        TEXT NOT NULL,            -- unique within its parent scope
  label            TEXT,
  hint             TEXT,
  placeholder      TEXT,
  input_type       INTEGER NOT NULL DEFAULT 0,  -- see src/lib/form-enums.ts
  required         BOOLEAN NOT NULL DEFAULT false,
  validation       JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {min,max,minLength,maxLength,pattern,integer,safeUrl}
  options          JSONB,                    -- [{value,label}] or ["a","b"] for select-like types
  options_source   TEXT,                     -- optional name of a list in src/lib/options.ts
  -- group / repeat controls (only meaningful when input_type = 20 GROUP)
  repeatable       BOOLEAN NOT NULL DEFAULT false,
  min_items        INTEGER,
  max_items        INTEGER,
  item_label       TEXT,                     -- e.g. "Member" → "Add Member"
  column_map       TEXT,                     -- submissions column to write to; null → answers JSONB
  visible          BOOLEAN NOT NULL DEFAULT true,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  conditional      JSONB,                    -- {field_key, equals}: show only when sibling equals value
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- field_key must be unique within a section among top-level fields, and within
-- a parent group among its children. Two partial unique indexes cover both.
CREATE UNIQUE INDEX IF NOT EXISTS form_fields_section_key_idx
  ON form_fields (section_id, field_key)
  WHERE parent_field_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS form_fields_parent_key_idx
  ON form_fields (parent_field_id, field_key)
  WHERE parent_field_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS form_fields_section_order_idx
  ON form_fields (section_id, parent_field_id, sort_order);
CREATE INDEX IF NOT EXISTS form_sections_step_order_idx
  ON form_sections (step, sort_order);

-- ===== submissions.answers — bag for admin-added (non-mapped) field values =====
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN submissions.answers IS
  'Values for admin-defined form fields that have no column_map. Keyed by field_key. Mapped/core fields still write to their dedicated columns.';

-- ===== RLS — deny anon; all access via service-role (same as other tables) =====
ALTER TABLE form_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields   ENABLE ROW LEVEL SECURITY;
-- No policies for anon/authenticated → default deny. Server uses service-role.
