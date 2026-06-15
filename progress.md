# Progress — Admin-Configurable Apply Form

> Living status doc for AI agents. Updated throughout the session. See
> `goals.md` (intent) and `docs/form-builder.md` (architecture).

_Last updated: 2026-06-15_

## Status: **applicant portal in progress** (code done; migration pending)

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
