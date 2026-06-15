# Progress — Admin-Configurable Apply Form

> Living status doc for AI agents. Updated throughout the session. See
> `goals.md` (intent) and `docs/form-builder.md` (architecture).

_Last updated: 2026-06-15_

## Status: code complete, **DB not yet applied/seeded**

The form-builder system is implemented and passing typecheck + unit tests, but
the migration has **not** been applied to Supabase and the seed has **not** run,
so `/apply` is still showing the static fallback and `/admin/forms` is empty.

## Done
- **Migration** `supabase/migrations/20260615_form_builder.sql` — `form_sections`,
  `form_fields` (recursive), `submissions.answers`, RLS, indexes.
- **Enums** `src/lib/form-enums.ts` — int `InputType` incl. `HEADING` (30) and
  `GROUP` (20); `ValidationSpec`.
- **Runtime** `src/lib/form-config.ts` (+ `.server.ts`) — types, `buildZodSchema`
  (scalars, repeatable/nested groups, city composite, conditional-required),
  `routeValues`, `buildDefaultValues`, step helpers. HEADING is a no-op in all.
- **Renderers** `DynamicForm.tsx`, `DynamicField.tsx` (recursive + repeatable
  groups; founders/city delegate to existing controls; HEADING renders a divider).
- **Apply page** loads config, falls back to static `ApplyForm` when unseeded.
- **Submit route** config-aware: routes values to columns vs `answers`; vetting +
  migration-resilient insert preserved.
- **Admin builder** `/admin/forms` — **Section = Step** model: one section per
  step, "Add step", move up/down, and per-section "Add field / Add heading / Add
  subsection (repeatable)"; API `src/app/api/admin/forms/route.ts` with
  `requireAdmin` + `audit_log`; "Form builder" tab in `AdminNav`; `answers`
  rendered in the submission detail.
- **Seed** `scripts/seed-form-config.ts` — 3 steps (Startup / Founders /
  Recognition) with HEADING dividers, flat fields, founders repeatable group.
- **Tests** `src/lib/__tests__/form-config.test.ts` — 16 passing (scalars,
  repeatable groups, conditional, city composite, HEADING ignored, section=step).
  Existing `schema.test.ts` (91) still pass.
- **Docs** `goals.md`, `docs/form-builder.md`, this file.

## Pending / next
1. **Apply DB** — chosen path: **user pastes the migration SQL in the Supabase SQL
   editor** (no `SUPABASE_DB_URL` in `.env.local`). Waiting on the user to run
   `supabase/migrations/20260615_form_builder.sql`; then the agent runs
   `pnpm tsx scripts/seed-form-config.ts --force` (works over service-role REST).
   `scripts/run-migration.ts` + `pg` remain available if a DB URI is added later.
2. **Manual verify** `/apply` (3 steps, dividers, founders repeater, conditionals)
   and `/admin/forms` (add step, headings, repeatable subsection).
3. Production build (`npm run build`) — not yet run this session.

## Known follow-ups (out of scope now)
- Wire admin-added (`answers`) fields into vetting and/or the public directory.
- Config version history beyond `audit_log`.

## How to run things
- Typecheck: `npx tsc --noEmit`
- Unit tests: `node --import tsx --test src/lib/__tests__/form-config.test.ts`
- Seed: `pnpm tsx scripts/seed-form-config.ts --force`
