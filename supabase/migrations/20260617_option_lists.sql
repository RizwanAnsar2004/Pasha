-- Admin-managed reusable option lists.
--
-- Until now, the named lists referenced by a field's options_source (SECTORS,
-- STAGES, …) lived only in code (src/lib/options.ts), so only a developer could
-- change them. This table lets admins create/edit reusable choice lists from the
-- portal. A DB list OVERRIDES a code list with the same `name`, so admins can
-- both add new lists and tweak the built-in ones without a deploy.
--
-- Idempotent. Paste into Supabase Dashboard -> SQL Editor -> Run.

CREATE TABLE IF NOT EXISTS option_lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,   -- the key a field references via options_source
  label       TEXT,                   -- friendly display name for the admin UI
  items       JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{value,label}] (or ["a","b"])
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE option_lists IS
  'Admin-managed reusable choice lists. A row whose name matches a code list in src/lib/options.ts overrides it at render time.';

-- RLS: deny anon/authenticated; all access via service-role (same as the rest).
ALTER TABLE option_lists ENABLE ROW LEVEL SECURITY;
