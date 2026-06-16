# Progress — Admin-Configurable Apply Form

> Living status doc for AI agents. Updated throughout the session. See
> `goals.md` (intent) and `docs/form-builder.md` (architecture).

_Last updated: 2026-06-16_

### Profile completion ladder + 6-state workflow — spec §12 (2026-06-16)
The applicant dashboard now shows the §12 completion ladder and the full
submission workflow; submission is gated at 50%.

- **Completion engine** `src/lib/profile-completion.ts` (isomorphic): the 5
  cumulative levels (Draft 25 → Public Profile Ready 50 → Business Profile 75 →
  Featured Eligible 90 → Investor Ready 100) + 5 dashboard modules, mapped to the
  §4–§11 `field_key`s. `computeCompletion(data)` → percent/level/benefit/next +
  per-module progress + `publicProfileMet/Missing`.
- **Workflow** `src/lib/workflow.ts` (isomorphic): `deriveStage()` +
  `STAGE_META` for the 6 states (Draft/Submitted/Needs Update/Approved/Verified/
  Featured, + Rejected). Verified = `databank.pasha_verified`, Featured =
  `featured_startups` (reused, not duplicated).
- **Migration (PENDING)** `supabase/migrations/20260622_profile_workflow.sql`:
  `pending`→`submitted` (+ default), adds `submissions.completion_score`. The new
  `needs_update` status needs no DDL (status is free TEXT).
- **Applicant dashboard** `apply/(portal)/page.tsx`: completion card (level + %
  + milestones + next-level hint), workflow status card (badge + spec visibility
  blurb + committee notes on Needs Update/Rejected + stage-aware CTA), 5 module
  cards deep-linking to `/apply/form?step=N`. `getApplicantSubmissionStatus()`
  (applicant-auth) loads status + verified/featured.
- **50% gate**: `DynamicForm` disables Submit < 50% with a missing-field hint;
  `api/submit` enforces it server-side, stores `completion_score`, and on
  resubmit **updates the existing submission** (status→submitted) instead of
  inserting a duplicate.
- **Admin 6-state** `api/admin/submission` + `SubmissionsClient`: statuses extend
  to submitted/needs_update; **Request update** (with notes) reopens the
  applicant draft (`submitted_at=null`); **Verify** toggles `pasha_verified` on
  the published row; approve→databank publish unchanged. Badges/filters driven by
  `STAGE_META`.
- `?step=` deep-link added to `apply/(portal)/form/page.tsx`.
- Lint + `tsc --noEmit` clean.

### Registration form (spec §3) + email verification (2026-06-16)
Sign-up now collects the §3 minimum fields, is **admin-customizable**, and
requires **email verification** before login.

- **Migration (PENDING):** `supabase/migrations/20260618_registration_form.sql`
  — adds `form_sections.form_key` (default `'application'`); adds
  `application_drafts.consent_at/consent_ip/consent_version`; seeds a
  `form_key='registration'` section + §3 fields (field keys mirror the
  application form so values prefill it).
- **Multi-form builder:** `getFormConfig(formKey)` + `getRegistrationConfig()`
  (`form-config.server.ts`); `form_key` added to `SECTION_COLS`
  (`api/admin/forms`); FormBuilderClient has an **Application / Registration**
  tab switcher (filters sections by form_key, stamps form_key on new steps).
- **Two-step sign-up:** `apply/login/AuthForm.tsx` — Step 1 email+password
  (fixed), Step 2 admin-configured §3 fields (reuses `DynamicField` +
  `buildZodSchema` + option lists), then a "verify your email" screen with
  Resend. `apply/login/page.tsx` loads the registration config + option registry.
- **Verification:** `registerApplicant()` uses `supabase.auth.signUp` (no more
  auto-confirm) → unconfirmed users can't log in (login surfaces
  `email_not_confirmed` + Resend). `seedApplicantDraft()` stores §3 answers +
  consent. New callback route `src/app/apply/auth/callback/route.ts`
  (exchange code / verifyOtp → `/apply`). `provisionApplicantAuthUser` removed.
- **Ops (required):** enable Supabase Auth "Confirm email" + add
  `${SITE_URL}/apply/auth/callback` to Redirect URLs, or the gate won't hold.
- **De-dup (PENDING):** `supabase/migrations/20260619_dedupe_registration_fields.sql`
  — hides the §3 fields that registration already captured from the
  application's **Startup** step (`startup_name`, `tagline`, `location` + its
  `h_location` heading, `stage`, `primary_sector`). Hidden (not deleted) so they
  still route their prefilled values to their `submissions` columns; also set
  `required = false` so a legacy draft can't stall behind a hidden field. Seed
  script (`scripts/seed-form-config.sql`) updated to match.
- Build + lint clean.

### Full application form — spec §4–§11 (2026-06-16)
The post-login application form now covers the entire spec via the **dynamic
form builder** (DB-driven, admin-editable), broken into **7 steps**:
1. **Startup** (§4 identity/brand/links + §11 mandatory card fields)
2. **Founders & team** (§5)
3. **Business profile** (§6 problem/solution/product/USP/GTM)
4. **Market & competition** (§7 competitors + TAM/SAM/SOM)
5. **Traction & funding** (§8 — ranges only)
6. **Operations & collaboration** (§9 hiring/partnerships/women-led)
7. **Documents & verification** (§10 — applicant-supplied docs)

- **Migration (PENDING):** `supabase/migrations/20260621_full_application_form.sql`
  — scoped DELETE + reseed of the `application` form only (registration
  untouched). Fields with a `column_map` keep writing to real `submissions`
  columns (vetting/directory); all new spec fields have `column_map=NULL` so the
  submit pipeline routes them into `submissions.answers` (JSONB) — **no schema
  change needed**. Reg-captured fields (startup_name, tagline, location, stage,
  primary_sector) stay hidden but still route their prefilled values.
- **New option lists** in `src/lib/options.ts` (auto-registered for
  `options_source`): `TEAM_SIZES`, `CONTACT_PREFERENCES`, `PRODUCT_MATURITY`,
  `TARGET_CUSTOMERS`, `GTM_CHANNELS`, `MONTHLY_REVENUE_RANGES`, `FUNDING_STATUS`,
  `FUNDING_AMOUNT_RANGES`, `OPERATING_MARKETS`, `OFFICE_TYPES`,
  `WOMEN_OWNERSHIP_RANGES`.
- Admin-only review fields (§10 notes/scores, §12 status) are intentionally NOT
  in the applicant form — they belong to the admin review workflow.
- File uploads reuse existing buckets (`logos` for images, `pitch-decks` for
  PDFs/docs) so no new storage infra is required.
- **Registration → application prefill:** the §3 fields shared with the
  application (`startup_name`, `tagline`, `location`/`hq_*`, `stage`,
  `primary_sector`) are shown **pre-filled and editable** (no longer hidden) and
  re-required per §11. `seedApplicantDraft()` now also seeds the **primary
  founder** card from `full_name`/`founder_mobile`/`email`, so the founder
  repeater isn't empty. (Applies to new registrations.)

## Status: **applicant portal in progress** (code done; migrations pending)

### Applicant portal (2026-06-15)
`/apply` is now an **applicant portal**, mirroring the admin `(authed)` pattern:
a `src/app/apply/(portal)/` route group with its own chrome (header + tab nav,
no public SiteHeader) gated by `getApplicantContext()`.

- `(portal)/layout.tsx` — gate + chrome (logo, "Applicant Portal", email,
  `SignOutButton`); anon → `/apply/login`, admin → `/apply/login?error=admin`.
- `(portal)/page.tsx` — **Overview** dashboard: status card (not started /
  in progress at step N of M / submitted) + "what happens next".
- `(portal)/form/page.tsx` — the **wizard** (`DynamicForm`); redirects to
  overview if already submitted.
- `(portal)/PortalNav.tsx` (Overview · My application), `SignOutButton.tsx`.
- Helpers added to `src/lib/applicant-auth.ts`: `getApplicantContext()` (cached;
  classifies anon/admin/applicant) and `getApplicantDraft(userId)` (cached).
- Old flat `src/app/apply/page.tsx` and `ApplyAccountBar.tsx` removed.

### Admin-managed option lists (2026-06-15)
Admins can now manage reusable choice lists from the portal (previously only in
code). New admin tab **Option lists** (`/admin/option-lists`).

- **Migration (PENDING):** `supabase/migrations/20260617_option_lists.sql` —
  `option_lists` table (name unique, label, items jsonb). RLS deny-all.
- **Model:** a DB list **overrides** a code list (`src/lib/options.ts`) with the
  same `name`. Three sources surfaced: `code` (built-in), `db` (custom),
  `override` (DB row shadowing a code list; can revert by deleting it).
- **Server:** `src/lib/option-lists.server.ts` — `getOptionRegistry()` (merged
  code+DB map for the renderer) and `getOptionListsForAdmin()` (manager/builder
  metadata). Both cached; degrade to code-only pre-migration.
- **Renderer wiring:** `resolveOptions(field, registry?)` takes a registry;
  `OptionListsContext` (provider in `DynamicForm`, consumed in `DynamicField`)
  carries it. Applicant form page passes `getOptionRegistry()` as `optionLists`.
- **Admin UI:** `/api/admin/option-lists` (GET/POST/PATCH/DELETE),
  `option-lists/page.tsx` + `OptionListsClient.tsx`. Builder "Built-in list"
  dropdown now lists code+DB names (passed from `forms/page.tsx` via
  `optionListNames`, threaded through `OptionNamesContext`).

### Form builder: inline options editor (2026-06-15)
**Gap:** choice fields (SELECT/MULTISELECT/RADIO_CARDS) could only get choices
via `options_source` (a name referencing `OPTION_LISTS` in `options.ts`) — there
was no UI to type custom options, so such fields rendered empty. The backend
already supported inline `options` (API `FIELD_COLS`, `resolveOptions()`).
**Fix:** `FormBuilderClient.tsx` now shows an **Options** textarea for choice
types (one per line, `value | label` supported) writing to `form_fields.options`.
Inline options win over `options_source`; blank falls back to the named list.

### Autosave loop fix (2026-06-15)
**Bug:** `/api/applicant/draft` was being PUT every ~1s even with no field
changes. Cause: `form.watch()` returns a new object each render and the
autosave's `setSaveState` re-renders → the `[values]` effect re-fired forever.
**Fix:** `DynamicForm` now diffs a serialized `{data,current_step}` snapshot
(`lastSavedRef`) and only saves on a real change; the baseline is recorded on
mount without a write, and the snapshot is marked saved before the fetch so a
failing endpoint (e.g. pre-migration) isn't hammered.

### Admin/applicant separation fix (2026-06-15)
**Bug:** an admin with an existing Supabase session could open & fill `/apply`
(the gate only checked "is there a session"). **Fix:** `getApplicantContext()`
classifies the session and treats **admin emails as non-applicants** — the page,
`/api/submit`, and `/api/applicant/draft` all reject them (`getApplicantUser()`
returns null for admins). Admins hitting `/apply` are redirected to
`/apply/login?error=admin` with an explanatory message.

### Applicant accounts + resumable apply (2026-06-15)
`/apply` now lives behind a **separate applicant auth wall** (Supabase Auth
users NOT in `admin_users`). Flow: register/sign in at `/apply/login` →
`getApplicantUser()` gates the page → the same admin-configured `DynamicForm`
renders (hidden fields stay hidden) → progress **autosaves server-side** to
`application_drafts` (one row per user) → final submit creates the `submissions`
row (now stamped with `user_id`) and marks the draft submitted. Returning users
resume where they left off; once submitted, `/apply` shows a "submitted" panel.

- **Migration (PENDING — run in Supabase):**
  `supabase/migrations/20260616_applicant_accounts.sql` — `application_drafts`
  table + `submissions.user_id`. Not yet applied (no `SUPABASE_DB_URL`; apply via
  SQL editor or `pnpm tsx scripts/run-migration.ts supabase/migrations/20260616_applicant_accounts.sql`).
- **Auth API** `src/app/api/applicant/auth/route.ts` — register/login/logout;
  refuses admin emails (keeps audiences separate); provisions via service-role
  admin API (`provisionApplicantAuthUser` in `src/lib/applicant-auth.ts`).
- **Draft API** `src/app/api/applicant/draft/route.ts` — GET/PUT the signed-in
  user's draft; won't overwrite an already-submitted application.
- **Submit route** — requires applicant session, links `user_id`, marks draft
  submitted (migration-resilient: `user_id` in `V2_COLUMNS`).
- **UI** — `/apply/login` (combined sign-in/register), `ApplyAccountBar`
  (signed-in-as + sign out), `DynamicForm` props `initialValues`/`initialStep`/
  `serverPersist` (server autosave replaces localStorage in this flow).
- Degrades gracefully pre-migration: auth gate works; draft persistence is a
  no-op until the table exists.

---

## Earlier status: **live in dev** (DB applied + seeded + auth wired)

Migration and seed were applied manually in the Supabase SQL editor. `/apply`
renders `DynamicForm` from `form_sections` / `form_fields`. `/admin/forms` is
populated with the seeded static form (3 steps, 54 fields).

Admin **writes** (form builder PATCH/POST/DELETE) require a real login:
`/api/admin/auth` establishes a **Supabase Auth session** plus `psec_admin`
cookie. Email must be in `admin_users`. Dev layout bypass still allows browsing
admin pages without login, but API mutations return 401 until signed in.

## Done
- **Migration** `supabase/migrations/20260615_form_builder.sql` — applied in
  Supabase (`form_sections`, `form_fields`, `submissions.answers`, RLS).
- **Seed** `scripts/seed-form-config.sql` (and `.ts`) — 3 steps (Startup /
  Founders / Recognition); static form mirrored with `column_map` on core fields.
- **Runtime** `src/lib/form-config.ts` (+ `.server.ts`) — Zod schema, routing,
  defaults, step helpers.
- **Renderers** `DynamicForm.tsx`, `DynamicField.tsx` (recursive groups;
  founders/city delegate to existing controls; HEADING dividers).
- **Apply page** — loads config; static `ApplyForm` fallback when tables empty.
- **Submit route** — config-aware validate + persist (`columns` vs `answers`);
  vetting + migration-resilient insert preserved.
- **Admin builder** `/admin/forms` — section = step; CRUD via
  `src/app/api/admin/forms/route.ts` + `audit_log`; `answers` in submission detail.
- **Admin auth** — `/api/admin/auth` signs into Supabase Auth (allowlist check via
  `admin_users`); auto-provisions Auth user on first login; logout clears both
  sessions. Helpers: `src/lib/supabase/route-handler.ts`,
  `src/lib/admin-auth-provision.ts`, `scripts/ensure-admin-auth.ts`.
- **Tests** `src/lib/__tests__/form-config.test.ts` — 16 passing; `schema.test.ts`
  (91) still pass.
- **Docs** `goals.md`, `docs/form-builder.md`, this file.

## Pending / next
1. **Sign in for saves** — use `/admin/login` with an email in `admin_users` and
   a password ≥ 12 chars (Supabase policy). Run
   `pnpm tsx scripts/ensure-admin-auth.ts` after setting `ADMIN_PASSWORD_HASH`.
2. **Manual verify** — end-to-end: edit form in `/admin/forms` → refresh `/apply`
   → submit application → confirm row in `submissions` (core columns + `answers`
   if any unmapped fields).
3. **Production build** — `npm run build` not yet run this session.
4. **Remove dev bypasses** before production — `TEMP REVIEW BYPASS` in
   `src/app/admin/(authed)/layout.tsx` and `src/proxy.ts`.

## Known follow-ups (out of scope now)
- Wire admin-added (`answers`) fields into vetting and/or the public directory.
- Config version history beyond `audit_log`.
- Unify or remove legacy `psec_admin`-only paths once Supabase auth is stable.

## How to run things
- Typecheck: `npx tsc --noEmit`
- Unit tests: `node --import tsx --test src/lib/__tests__/form-config.test.ts`
- Seed (reset config to defaults): `pnpm tsx scripts/seed-form-config.ts --force`
  — or paste `scripts/seed-form-config.sql` in Supabase SQL editor.
- Provision admin Auth user: `pnpm tsx scripts/ensure-admin-auth.ts`
  (requires `ADMIN_EMAIL` in `admin_users` + `ADMIN_PASSWORD_HASH` ≥ 12 chars).
