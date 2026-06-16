# P@SHA Startup Directory — Whole-App Test Plan

A phased, mostly-manual QA script covering the public site, the applicant flow,
the admin review workflow, badges, and the profile-completion system. Work top
to bottom — later phases assume earlier ones passed.

**Legend:** ☐ = to test · ✅ pass · ❌ fail · ⚠️ partial. Record results in the
table at the bottom.

---

## Phase 0 — Prerequisites & static checks

**0.1 Apply migrations (Supabase SQL Editor, in order; all idempotent):**
1. `20260617_option_lists.sql`
2. `20260618_registration_form.sql`
3. `20260621_full_application_form.sql`
4. `20260622_profile_workflow.sql` — adds enum values `submitted`/`needs_update` + `completion_score`
5. `20260623_directory_badges.sql` — adds `databank.women_led/hiring/fundraising`

**0.2 Supabase Auth settings:** Email provider → **Confirm email ON**, **Allow new users to sign up ON**; URL Configuration → Redirect URLs include `${SITE_URL}/apply/auth/callback`.

**0.3 Storage:** buckets `logos` and `pitch-decks` exist.

**0.4 Static checks (terminal):**
- ☐ `npx tsc --noEmit` → no errors
- ☐ `npx eslint "src/**/*.{ts,tsx}"` → no **new** errors (2 pre-existing: `CTA.tsx`, `DatabankClient.tsx`)
- ☐ `npm run build` → succeeds

---

## Phase 1 — Public site & directory

- ☐ **1.1** `/` landing renders (hero, featured startups, committee banner, FAQ).
- ☐ **1.2** `/directory` loads; result count + sector/city dropdowns populated.
- ☐ **1.3** Search by name/sector/city filters the list.
- ☐ **1.4** Grid ⇄ List view toggle works; pagination works.
- ☐ **1.5** **Filters:** P@SHA Verified, **Women-led**, **Hiring** toggles each narrow results; "Reset filters" clears all.
- ☐ **1.6** A verified startup shows the **Verified** badge; women-led/hiring/fundraising startups show their **pills** on the card.
- ☐ **1.7** Click a card → `/directory/[slug]` detail; header shows name, tagline, verified badge + earned badge pills; founders/socials/sections render.
- ☐ **1.8** Public detail page does **not** expose pitch deck / verification docs / reviewer notes.

---

## Phase 2 — Registration + email verification (§3)

- ☐ **2.1** `/apply/login` → Register → **Step 1** (email + password); weak password / bad email blocked.
- ☐ **2.2** **Step 2** renders the admin-configured registration fields (full name, mobile, startup name, location, stage, sector, tagline, terms). Required-field validation works.
- ☐ **2.3** Submit → "verify your email" screen; **no portal access yet**.
- ☐ **2.4** A row exists in `application_drafts` with the §3 values + `consent_at/ip/version`.
- ☐ **2.5** Try to log in before verifying → blocked with "verify your email" + **Resend** works.
- ☐ **2.6** Click the emailed link → lands on `/apply` signed in.
- ☐ **2.7** Registering/logging in with an **admin** email → refused (403, "use the admin portal").

---

## Phase 3 — Applicant dashboard (§12/§13)

- ☐ **3.1** `/apply` greets by name; **startup snapshot** card (top) shows registration tagline/stage/sector/location/mobile.
- ☐ **3.2** **Status + completion hero**: one card showing stage badge (**Draft**), big **%** (~25%), the 5-level ladder (Draft highlighted), "Next — …" hint, and a CTA. No duplicated "Draft" heading.
- ☐ **3.3** **Badges** section: women-led/hiring/fundraising show as **locked** with how-to hints (until declared); Verified/Featured locked ("awarded by committee").
- ☐ **3.4** **Application steps** cards mirror the form's 7 steps — titles + sublines from the form config, `x/total` counts, progress bars.
- ☐ **3.5** A step card's **Complete →** opens `/apply/form` at that exact step (`?step=N`).

---

## Phase 4 — Application form (§4–§11)

- ☐ **4.1** `/apply/form` opens; **prefilled** from registration (startup name, tagline, location, stage, sector) and the **primary founder** card (name/email/mobile).
- ☐ **4.2** All 7 steps present: Startup, Founders & team, Business profile, Market & competition, Traction & funding, Operations & collaboration, Documents & verification.
- ☐ **4.3** Conditional fields work: Open roles only when "Currently hiring? = Yes"; Amount raising only when "Currently fundraising? = Yes"; women-led name/ownership only when women-led = Yes.
- ☐ **4.4** Option dropdowns populated (sectors, stages, team size, product maturity, funding status, ranges, operating markets, etc.).
- ☐ **4.5** File uploads work (logo, pitch deck, docs); autosave shows "Progress saved"; leave + return resumes at the same step/values.
- ☐ **4.6** **50% submit gate:** below Public Profile Ready the **Submit is disabled** with "Reach 50% … still needed: …" listing the missing fields (using the form's own field labels).
- ☐ **4.7** Fill logo, description, sector, stage, business model, team size → reach 50% → Submit enables → submit succeeds → redirect to success.
- ☐ **4.8** `POST /api/submit` below 50% returns **400** (server gate), even if the button is bypassed.

---

## Phase 5 — Admin review workflow (§12 6-state)

- ☐ **5.1** `/admin/submissions` lists the new submission with status **Submitted**; filter chips: Submitted / Needs Update / Approved / Rejected.
- ☐ **5.2** Open the drawer → **Request update** with a note → submission = Needs Update; the applicant's draft reopens (`submitted_at` cleared).
- ☐ **5.3** On the applicant `/apply`: stage = **Needs Update**, the committee note shows, CTA = **Edit & resubmit**; the form reopens for editing.
- ☐ **5.4** Edit + resubmit → updates the **same** submission row back to **Submitted** (no duplicate row).
- ☐ **5.5** **Reject** with a note → applicant sees "Not accepted" + note.
- ☐ **5.6** **Approve** → row materialises into `databank` → appears on `/directory`.
- ☐ **5.7** Post-approval drawer: **Verify** toggles `pasha_verified` (applicant stage → **Verified**, directory shows Verified); **Edit listing** link works.
- ☐ **5.8** `completion_score` is stored on the submission at submit.
- ☐ **5.9** Every action writes an `audit_log` entry.

---

## Phase 6 — Badges end-to-end (§13)

- ☐ **6.1** In the form set Women-led = Yes, Currently hiring = Yes, Currently fundraising = Yes.
- ☐ **6.2** `/apply` Badges section lights up Women-led / Hiring / Fundraising (earned, colored).
- ☐ **6.3** Submit → Approve → the `databank` row has `women_led/hiring/fundraising = true`.
- ☐ **6.4** Directory card + detail show the badge pills; the **Women-led** and **Hiring** filters include the startup.
- ☐ **6.5** **Opt-in rule:** a startup with women-led = No shows **no** women-led badge anywhere.
- ☐ **6.6** Verified badge appears only after admin **Verify**; Featured only during an active featured window.

---

## Phase 7 — Profile completion ladder (§12)

- ☐ **7.1** New account ≈ **25%** (Draft) once registration data is present.
- ☐ **7.2** Logo + description + sector + stage + business model + team size → **50%** (Public Profile Ready); milestone chip flips to ✅.
- ☐ **7.3** Problem/solution/features/USP + market + competitors → **75%**.
- ☐ **7.4** Traction + awards + partnerships → **90%**.
- ☐ **7.5** TAM/SAM/SOM + funding status + pitch deck + contact preference → **100%** (Investor Ready).
- ☐ **7.6** The hero % and the "Next —" hint update live as fields are filled.

---

## Phase 8 — Admin tooling & form builder

- ☐ **8.1** `/admin/forms` — **Application** / **Registration** tabs; switching shows each form's steps only.
- ☐ **8.2** Add / rename / reorder a step or field → persists; appears on the live form; the dashboard **Application steps** cards reflect the rename (config-driven).
- ☐ **8.3** Option-list manager (`/admin/option-lists`) — create/edit a list; it appears in field dropdowns.
- ☐ **8.4** `/admin/databank` editor loads + edits a listing; verified toggle works.
- ☐ **8.5** `/admin/featured-startups` schedules a featured window → startup shows Featured.
- ☐ **8.6** Committee management / activity, events admin load without error.
- ☐ **8.7** Super-admin allowlist (`/super-admin`) add/remove admin works.

---

## Phase 9 — Regression & edge cases

- ☐ **9.1** Legacy `pending` submissions render as **Submitted** (no enum/display errors).
- ☐ **9.2** Pre-migration graceful degradation: with `20260623` not applied, directory still loads (column fallback) and approve doesn't hard-crash. *(Confirm migrations applied for production.)*
- ☐ **9.3** Admin session cannot access the applicant apply flow; applicant cannot reach `/admin`.
- ☐ **9.4** Directory "View" button navigates to the detail page (overlay link not blocked).
- ☐ **9.5** Mobile/responsive: dashboard cards, form steps, and directory grid reflow on small screens.

---

## Automated results (run 2026-06-17)

| Check | Result | Notes |
|------|--------|-------|
| `tsc --noEmit` (whole repo) | ✅ | exit 0, no type errors |
| `npm run build` | ✅ | exit 0; 31 pages + all routes compiled |
| `eslint src/**` | ⚠️ | 2 **pre-existing** errors only — `CTA.tsx` (motion.create in render), `DatabankClient.tsx` (setState-in-effect); none from recent work |
| Completion/badge field_keys exist in form seed | ✅ | all 30 keys present in `20260621` |
| `options_source` → registered option lists | ✅ | all 16 lists resolve in `options.ts` |
| **Workflow + edge-case tests** (`npx tsx scripts/workflow-tests.ts`) | ✅ | **53/53 pass** — completion ladder + 50% gate, 6-state review derivation, badge earning, step-module mirroring, + 24 edge cases (null data, any-of groups, cumulative gate, presence-vs-length, isYes coercion, divide-by-zero, city/group/hidden/inactive fields) |

Functional phases (1–9) require a running app + Supabase (auth emails, RLS,
storage) + a browser, so they are **manual** — execute and fill the table below.

## Results summary

| Phase | Area | Result | Notes |
|------|------|--------|-------|
| 0 | Setup & static checks | ✅ | tsc + build green; lint has 2 pre-existing errors; cross-checks pass |
| 1 | Public site & directory |  |  |
| 2 | Registration + verification |  |  |
| 3 | Applicant dashboard |  |  |
| 4 | Application form |  |  |
| 5 | Admin review workflow |  |  |
| 6 | Badges end-to-end |  |  |
| 7 | Completion ladder |  |  |
| 8 | Admin tooling / builder |  |  |
| 9 | Regression & edge |  |  |

**Out of scope (de-scoped):** field-level visibility (public/private/admin/investor),
investor role + investor directory, committee-reviewer permission tier.

**Known minor gaps:** secure document storage (signed URLs + virus-scan / `startup_files`);
committee feedback is the latest note rather than a threaded history.
