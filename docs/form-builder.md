# Form Builder — Architecture Reference

How the admin-configurable apply form works, for agents extending it. See
`goals.md` for intent and `progress.md` for current status.

## Big picture

The apply form is described by rows in two DB tables. A runtime layer turns those
rows into (a) a Zod schema for validation and (b) a React renderer. Admins edit
the rows at `/admin/forms`. If the tables are empty/missing, the app falls back
to the original hard-coded form so nothing breaks.

```
form_sections / form_fields (DB)
        │  getFormConfig()  (src/lib/form-config.server.ts, cached, service role)
        ▼
FormConfig  (src/lib/form-config.ts types)
        ├─ buildZodSchema(config)      → runtime Zod schema (validation)
        ├─ buildDefaultValues(config)  → RHF defaults
        ├─ stepFieldKeys / stepTitlesOf / sectionsForStep → wizard driving
        └─ routeValues(config, data)   → { columns, answers } for persistence
        ▼
DynamicForm.tsx  (wizard) → DynamicField.tsx (one field, recursive)
```

## Data model

`supabase/migrations/20260615_form_builder.sql`

- **`form_sections`** — one row per **step**. `step` (unique ordering), `title`,
  `subtitle`, `sort_order`, `is_active`.
- **`form_fields`** — recursive via `parent_field_id` (null = top-level under a
  section; set = nested inside a GROUP). Key columns:
  - `field_key` (unique within parent scope; matches a `submissions` column for
    core fields)
  - `input_type` (int enum — see below)
  - `required`, `validation` (JSONB), `options` / `options_source`
  - GROUP-only: `repeatable`, `min_items`, `max_items`, `item_label`
  - `column_map` — the `submissions` column to write to; `null` → goes to
    `submissions.answers` JSONB
  - `conditional` (`{field_key, equals}`) — show only when a sibling equals a value
  - `visible`, `sort_order`
- **`submissions.answers`** (JSONB) — values for fields without a `column_map`.

## Int-based input types

`src/lib/form-enums.ts` — `InputType`:

| # | type | renders as | value shape |
|---|------|-----------|-------------|
| 0 | TEXT | `ui/Input` | string |
| 1 | EMAIL | Input (email) | string |
| 2 | URL | Input (url, safe http/https) | string |
| 3 | PHONE | Input (tel) | string |
| 4 | NUMBER | Input (number) | number |
| 5 | TEXTAREA | `ui/Input` Textarea | string |
| 6 | SELECT | `ui/Select` | string |
| 7 | MULTISELECT | `ui/RadioCard` CheckboxGroup | string[] |
| 8 | YES_NO | `ui/RadioCard` YesNo | boolean |
| 9 | RADIO_CARDS | `ui/RadioCard` RadioCardGroup | string |
| 10 | DATE | Input (date) | string |
| 20 | GROUP | subsection; repeatable→array | object / object[] |
| 30 | HEADING | label-only divider | (no value) |
| 90 | FILE_UPLOAD | `FileUpload` (bucket in `validation`) | string (url) |
| 91 | CITY_COMPOSITE | `CityField` | expands to hq_city/hq_other/outside_pakistan/hq_country |

**Section = Step.** Each `form_sections` row is one wizard step. Visual
sub-groups within a step (BASICS, LOCATION…) are **HEADING** fields, so value
fields stay flat (top-level keys) and routing to columns/vetting is simple.

## Value routing (preserving the dataset)

`routeValues(config, data)` walks the config: a field with `column_map` writes to
that `submissions` column (a repeatable GROUP writes its array, like `founders`);
everything else goes into the `answers` JSONB. HEADING fields are skipped. The
submit route (`src/app/api/submit/route.ts`) then builds the insert record the
same way as before, so vetting + `databank` materialization are untouched.

## Key files

- `src/lib/form-enums.ts` — int enum + `ValidationSpec` + helpers.
- `src/lib/form-config.ts` — types, `buildZodSchema`, `routeValues`,
  `buildDefaultValues`, step helpers, `resolveOptions`.
- `src/lib/form-config.server.ts` — `getFormConfig()` DB loader (cached).
- `src/components/form/DynamicForm.tsx` — config-driven wizard.
- `src/components/form/DynamicField.tsx` — one field; recursion + repeatable groups.
- `src/app/apply/page.tsx` — loads config; falls back to static `ApplyForm`.
- `src/app/api/submit/route.ts` — config-aware validate + persist.
- `src/app/admin/(authed)/forms/*` + `src/app/api/admin/forms/route.ts` — builder.
- `scripts/seed-form-config.ts` — seeds the current form into the tables.
- `scripts/run-migration.ts` — applies a SQL migration via `SUPABASE_DB_URL`.

## How to extend

**Add a new input type:** add it to `InputType` + `INPUT_TYPE_LABELS` in
`form-enums.ts`; handle it in `scalarZod`/`buildDefaultValues`/`routeValues`
(form-config.ts) and add a render case in `DynamicField.tsx`. If it isn't a plain
scalar, mirror the GROUP/CITY_COMPOSITE special-casing.

**Reuse option lists:** add to `OPTION_LISTS` in `src/lib/options.ts` and
reference by name via a field's `options_source`.

## Apply + seed (DB ops)

1. Add a Postgres URI to `.env.local` as `SUPABASE_DB_URL` (Supabase → Settings →
   Database → Connection string → URI, with the DB password).
2. `pnpm tsx scripts/run-migration.ts supabase/migrations/20260615_form_builder.sql`
3. `pnpm tsx scripts/seed-form-config.ts --force`

Fallback without a URI: paste the migration SQL in the Supabase SQL editor, then
run only the seed (works via the service-role REST key).
