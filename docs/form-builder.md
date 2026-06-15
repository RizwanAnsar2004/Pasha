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
        │
        ▼ POST /api/submit
submissions row (core columns + answers JSONB + vetting)
```

`/apply` is `force-dynamic` — admin edits appear on the next page load without
redeploy.

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

**Special renderers** (not driven by nested `form_fields` rows):
- `founders` GROUP → `FoundersRepeater` (hardcoded sub-fields; writes `founders` JSONB)
- `location` CITY_COMPOSITE → `CityField` (writes `hq_city`, `hq_other`, etc.)

## Value routing & submission storage

`routeValues(config, data)` walks the config and splits a validated payload:

| Field config | Stored as |
|--------------|-----------|
| `column_map` set | That `submissions` column (e.g. `startup_name`, `founders`) |
| `column_map` null | `submissions.answers[field_key]` |
| HEADING (30) | Skipped — no value |
| CITY_COMPOSITE (91) | `hq_city`, `hq_other`, `outside_pakistan`, `hq_country` columns |

`POST /api/submit` (`src/app/api/submit/route.ts`):

1. `getFormConfig()` — dynamic schema if seeded, else static `submissionSchema`
2. `buildZodSchema(config).safeParse(body)` — validate
3. `routeValues(config, data)` — `{ columns, answers }`
4. `scoreVetting()` — reads **core columns only** (unchanged)
5. `INSERT INTO submissions` — one row per application

Example row shape (simplified):

```
startup_name     → "Acme Inc"          (column)
website          → "https://acme.com"  (column)
founders         → [{ name, email, … }] (JSONB column)
answers          → { "extra_q": "Yes" } (JSONB — admin-added fields only)
vetting_score    → 72                  (computed)
status           → "pending"           (default)
```

Admin submission detail (`SubmissionsClient`) shows core columns plus any keys in
`answers`. Approval → `databank` still materialises from core columns only.

## Admin auth (form builder writes)

Admin pages and admin APIs use **different** gates:

| Action | Auth |
|--------|------|
| View `/admin/forms` (page) | `psec_admin` cookie from `/admin/login`, or dev layout bypass |
| Load form data on page | `createServiceClient()` (service role — no user session) |
| `PATCH/POST/DELETE /api/admin/forms` | **Supabase Auth session** + email in `admin_users` |

Login flow (`POST /api/admin/auth`):

1. Email must be in `admin_users` (`isAdminEmail()`)
2. `signInWithPassword` → sets Supabase `sb-*` cookies on the response
3. First login for an allowlisted email auto-creates the Supabase Auth user
   (`provisionSupabaseAuthUser`)
4. Also sets `psec_admin` cookie for the admin layout

Logout (`POST /admin/logout`) clears both Supabase session and `psec_admin`.

**Common 401 on PATCH:** browsing admin via dev bypass without signing in — pages
render (service-role read) but API mutations fail. Fix: sign in at `/admin/login`.

**Password policy:** Supabase requires ≥ 12 characters. Provision with:

```bash
pnpm tsx scripts/ensure-admin-auth.ts
```

(requires `ADMIN_EMAIL` in `admin_users` and `ADMIN_PASSWORD_HASH` in `.env.local`)

Key auth files:

- `src/app/api/admin/auth/route.ts` — login / logout API
- `src/lib/supabase/route-handler.ts` — Supabase client + cookie forwarding for routes
- `src/lib/admin-auth-provision.ts` — create/update Supabase Auth users
- `src/lib/admin-allowlist.ts` — `admin_users` table lookup (30s cache)
- `scripts/ensure-admin-auth.ts` — one-time Auth user + password setup

## Applicant portal (auth wall + resumable drafts)

`/apply` is an **applicant portal** gated by a **separate** auth (Supabase Auth
users NOT in `admin_users`) so it never overlaps the committee portal. It
mirrors the admin `(authed)` pattern: a `src/app/apply/(portal)/` route group
with its own header + tab nav. The wizard reuses the same `DynamicForm` /
`getFormConfig()`, so hidden fields (`visible=false`) stay hidden — the applicant
sees exactly the admin's build.

```
src/app/apply/
  (portal)/                 ← gated group (own chrome, no SiteHeader)
    layout.tsx              getApplicantContext(): anon→login, admin→login?error=admin
    page.tsx                Overview — status card (not started / in progress / submitted)
    form/page.tsx           Wizard — DynamicForm; redirect→overview if already submitted
    PortalNav.tsx           tabs: Overview · My application
    SignOutButton.tsx       DELETE /api/applicant/auth
  login/page.tsx            register + sign-in (NOT in the group; no portal chrome)
  success/...               post-submit confetti page (NOT in the group)
```

Flow:

```
/apply (overview)  status from application_drafts
/apply/form        DynamicForm + initialValues + initialStep + serverPersist
        │  (debounced) PUT /api/applicant/draft  → application_drafts upsert
        ▼  final submit
  POST /api/submit → submissions row (user_id) + draft.submitted_at stamped
```

**Admin/applicant separation is enforced, not assumed.** Both audiences share
Supabase Auth cookies, so `getApplicantContext()` (cached) classifies the
session as `anon | admin | applicant` and `getApplicantUser()` returns null for
admins. The page gate AND every applicant API (`/api/submit`,
`/api/applicant/draft`) reject admins — an admin session can never fill or submit
the form.

| Concern | Where |
|---------|-------|
| Session classification | `getApplicantContext()` in `src/lib/applicant-auth.ts` (cached) |
| Applicant-only API gate | `getApplicantUser()` (null for anon AND admin) |
| Register / login / logout | `POST,DELETE /api/applicant/auth` (refuses admin emails) |
| Provision Auth user | `provisionApplicantAuthUser()` (service-role, `email_confirm`) |
| Resumable draft (load) | `getApplicantDraft(userId)` (cached) + `GET /api/applicant/draft` |
| Resumable draft (save) | `PUT /api/applicant/draft` → `application_drafts` upsert |
| Owning applicant on a submission | `submissions.user_id` (nullable; null for legacy/admin rows) |

Migration: `supabase/migrations/20260616_applicant_accounts.sql`. The submit
route is migration-resilient (`user_id` in `V2_COLUMNS`), and the portal degrades
to a working (non-persistent) form if the drafts table is absent.

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
- `scripts/seed-form-config.ts` + `scripts/seed-form-config.sql` — seed static form.
- `scripts/run-migration.ts` — applies a SQL migration via `SUPABASE_DB_URL`.
- `scripts/ensure-admin-auth.ts` — provision Supabase Auth for `ADMIN_EMAIL`.

## How to extend

**Add a new input type:** add it to `InputType` + `INPUT_TYPE_LABELS` in
`form-enums.ts`; handle it in `scalarZod`/`buildDefaultValues`/`routeValues`
(form-config.ts) and add a render case in `DynamicField.tsx`. If it isn't a plain
scalar, mirror the GROUP/CITY_COMPOSITE special-casing.

**Give a choice field its options (SELECT / MULTISELECT / RADIO_CARDS):** two
ways, both resolved by `resolveOptions(field, registry?)` (inline wins, then the
named list, then empty):
- **Inline** — type one option per line in the field's **Options** box
  (`value | label`). Saved to `form_fields.options` JSONB as `[{value,label}]`.
- **Named list** — pick a list in the **Built-in list** dropdown
  (`options_source`). The dropdown lists code lists **and** admin-managed DB
  lists (names passed from `forms/page.tsx`).

### Reusable option lists (code + admin-managed)

Named lists come from two places, merged at render time by
`getOptionRegistry()` (`src/lib/option-lists.server.ts`):
- **Code** — `OPTION_LISTS` in `src/lib/options.ts` (developer-maintained).
- **DB** — the `option_lists` table, managed by admins at **`/admin/option-lists`**.

A DB row whose `name` matches a code list **overrides** it (shown as
"Built-in · overridden"; deleting the row reverts to the code default). New DB
lists show as "Custom". Migration: `supabase/migrations/20260617_option_lists.sql`.

Renderer flow: the form page calls `getOptionRegistry()` and passes it to
`DynamicForm` as `optionLists`; `OptionListsProvider` puts it in context;
`DynamicField` reads it via `useOptionRegistry()` and calls
`resolveOptions(field, registry)`. With no provider, `resolveOptions` falls back
to the code-only lists, so the form still works.

A choice field with neither inline options nor a valid list renders empty — the
builder shows both inputs together so it's clear one is required.

**Add an admin-only field:** create in `/admin/forms` with `column_map` empty →
values land in `submissions.answers`. They won't affect vetting or the public
directory until explicitly wired.

## Apply + seed (DB ops)

**Option A — SQL editor (no DB URI needed):**

1. Paste `supabase/migrations/20260615_form_builder.sql` → Run
2. Paste `scripts/seed-form-config.sql` → Run
3. Verify: `SELECT count(*) FROM form_sections` → 3; `form_fields` → 54

**Option B — CLI:**

1. Add `SUPABASE_DB_URL` to `.env.local` (Postgres URI from Supabase dashboard)
2. `pnpm tsx scripts/run-migration.ts supabase/migrations/20260615_form_builder.sql`
3. `pnpm tsx scripts/seed-form-config.ts --force`

**Admin auth setup (after adding email to `admin_users`):**

1. Set `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` (≥ 12 chars) in `.env.local`
2. `pnpm tsx scripts/ensure-admin-auth.ts`
3. Sign in at `/admin/login`

Re-running the seed **wipes** form config back to defaults (`DELETE` + re-insert).
