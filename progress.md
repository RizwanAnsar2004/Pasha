# Progress — Admin-Configurable Apply Form

> Living status doc for AI agents. Updated throughout the session. See
> `goals.md` (intent) and `docs/form-builder.md` (architecture).

_Last updated: 2026-06-15_

## Status: **live in dev** (DB applied + seeded + auth wired)

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
