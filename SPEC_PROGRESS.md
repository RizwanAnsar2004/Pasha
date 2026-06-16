# P@SHA Startup Directory — Spec vs. Implementation

Tracks the project against **PASHA_Startup_Directory_Developer_Spec_Updated.pdf**
(P@SHA Startups & Entrepreneurship Committee — System Field Specification, 16 pages).

> **Bottom line:** the *foundation* is solid — public directory, application
> intake, admin moderation, an admin-configurable form, applicant accounts with a
> resumable draft, audit logging and a verified badge all work. But the spec's
> **defining themes — per-field visibility (public/private/admin/investor), an
> investor role + investor-only directory, a profile-completion dashboard, and the
> full review state machine — are largely not built yet.**
>
> **Overall: ~40–45% of the spec's surface area is implemented.**

---

## At a glance (by spec section)

| # | Spec section | Status | Notes |
|---|--------------|--------|-------|
| 1 | Purpose & scope | n/a | Narrative |
| 2 | Roles & visibility model | 🟡 Partial | Public + Admin + (applicant) Startup-user exist. **No Investor role, no Committee-reviewer role, no field-level visibility model.** |
| 3 | Minimum registration fields | 🟢 Done | Two-step sign-up collects the §3 fields (admin-customizable via the Registration form in the builder); email verification enforced via `signUp` (unconfirmed users can't log in); consent timestamp/IP/version recorded. Remaining nice-to-haves: phone-number uniqueness. _(Requires migration `20260618` + Supabase "Confirm email" ON.)_ |
| 4 | Full startup profile fields | 🟡 Partial | Logo, legal name, year, description, website, socials, slug ✅. Cover image, public-contact-preference enum ❌. |
| 5 | Founder / team / contact | 🟡 Partial | Structured founders (name/role/email/phone/linkedin/photo/gender), team size, gender ✅. Founder bio, **per-founder visibility toggles** ❌. |
| 6 | Problem / solution / product / USP | 🟡 Partial | `startup_idea`, `business_model`, `social_impact` exist; admin can add more via form builder. Not first-class: problem, solution, USP, product maturity, target customers, GTM, demo/app-store/screenshots. |
| 7 | Competition, market sizing & GTM (TAM/SAM/SOM) | 🔴 Missing | No competitor fields, no market sizing. |
| 8 | Traction, recognition & funding | 🟡 Partial | Revenue, investment raised/commitment, customers, funding stage, currently-raising, awards, certifications ✅. **"Open to investor contact", investor-only visibility** ❌. |
| 9 | Operations, collaboration & women-led | 🟡 Partial | Female founder/employee counts, engagement interests ✅. **Women-led public badge, operating markets, hiring/open-roles, partnership toggles** mostly ❌. |
| 10 | Documents, verification & admin | 🟡 Partial | Pitch deck, reviewer notes, status, `pasha_verified` ✅. CNIC/passport, NTN, reg cert, authorization letter, virus-scan, **Featured flag**, full verification enum ❌. |
| 11 | Mandatory public directory fields | 🟢 Mostly | Cards show name, logo, one-line, sector, stage, city, team size, slug, verified badge ✅. **Women-led / hiring / fundraising badges** ❌. |
| 12 | Dashboard workflow & completion levels | 🔴 Mostly missing | Applicant portal = a single resumable form, **not** the multi-module dashboard. **No 25/50/75/90/100% completion scoring. No "Needs Update → resubmit" loop.** |
| 13 | Data model, API & validation | 🟡 Partial | Tables for accounts/startups/founders(JSONB)/reviews(inline)/audit ✅. **No `startup_profile_fields` with per-field visibility, no `startup_files` table, no role-filtered public API, no field-metadata visibility policy.** |
| 14 | Enums, dropdowns & acceptance criteria | 🟡 Partial | Stage/model/team-size/funding enums exist + admin-managed option lists ✅. Several acceptance criteria (visibility options, role-filtered API, visibility audit) ❌. |
| 15 | Implementation checklist | 🟡 Partial | Minimal registration ✅, directory card public-only ✅. Visibility selectors, role-filtered API, signed file access, completion score, request-update workflow ❌. |

Legend: 🟢 mostly done · 🟡 partial · 🔴 missing.

---

## ✅ What's already built

- **Public directory** (`/directory`) — searchable/filterable grid & list cards,
  sector/city filters, P@SHA-verified filter, detail pages (`/directory/[slug]`).
- **Application intake** — multi-step apply form posting to `submissions`, with a
  vetting score/tier computed on insert.
- **Admin-configurable form builder** — `form_sections` / `form_fields`
  (recursive groups, repeatable subsections, conditional fields, validations),
  plus admin-managed reusable **option lists**.
- **Applicant accounts + portal** (`/apply/*`) — separate auth wall from admin,
  register/login, **one resumable server-side draft** per applicant, partial
  save & resume, review/edit, then submit. Admins are explicitly blocked from
  filling the apply form.
- **Admin portal** (`/admin/*`) — submissions moderation (approve/reject +
  reviewer notes), databank editor, P@SHA-verified toggle, option-list manager.
- **Super-admin** (`/super-admin/*`) — admin allowlist management.
- **Audit log** — immutable trail of admin actions.
- **P@SHA Verified badge** — admin-toggled trust signal on cards + detail pages.

---

## ❌ Major gaps (the spec's core differentiators)

1. **Field-level visibility model** — the single biggest theme of the spec.
   No per-field `visibility` (public / private / admin-only / investors-only),
   no user opt-in toggles, no "mandatory public fields can't be hidden after
   publish" enforcement, no audit of visibility changes.
2. **Investor role + investor-only data + investor directory** — entirely absent
   (no investor auth, no investor-only fields, no "open to investor contact").
3. **Committee-reviewer role** — absent (only a single admin role exists).
4. **Profile-completion dashboard** — the spec's 6 modules (Complete Profile /
   Founder & Team / Business Profile / Investor Readiness / Programs & Badges /
   Review Status) and the **25/50/75/90/100% completion scoring** are not built;
   the applicant side is one linear form, not a dashboard.
5. **Full review state machine** — only `pending → approved/rejected`. Missing
   **Needs Update → resubmit**, **Verified** (as an enum state), and **Featured**.
6. **Market sizing & competition** — TAM/SAM/SOM and competitor fields (§7).
7. **Documents & verification** — no `startup_files` table, no signed/role-gated
   file access, no virus-scan status; verification docs (CNIC, NTN, reg cert,
   authorization letter) not modelled.
8. **Badge system** — only `pasha_verified`; no women-led / hiring / fundraising
   / featured badges as toggleable, filterable public signals.
9. **Role-filtered public API** — endpoints don't strip fields by viewer role;
   the public directory relies on a curated/approved `databank` instead.
10. **Registration hardening** — no email/phone verification (OTP/link), no phone
    uniqueness, no consent timestamp/IP/policy-version capture.

---

## Suggested next milestones (in priority order)

1. **Visibility foundation** — add a `visibility` enum to fields + a
   `startup_profile_fields`-style store (or per-column visibility map), and make
   the public API/detail page strip non-public fields by viewer role. *Unlocks
   §2, §11, §15 and most acceptance criteria.*
2. **Review state machine** — extend `submissions.status` to
   Draft/Submitted/Needs-Update/Approved/Verified/Featured + an admin
   "request update" action with comments and applicant resubmit. *Unlocks §10, §12.*
3. **Completion-level dashboard** — turn the applicant portal into the 6-module
   dashboard with a server-side completion score (25/50/75/90/100%). *§12.*
4. **Badge system** — generalise `pasha_verified` into a `badges` table
   (verified, women-led, hiring, fundraising, featured) with public filters. *§9, §11.*
5. **Investor role** — investor auth + investor-only field tier + investor
   directory view. *§2, §7, §8.*
6. **Documents/verification table** — `startup_files` with signed access +
   scan status; model verification docs. *§10.*

---

*Generated from a section-by-section audit of the spec against the current
codebase (migrations, API routes, form config, directory & admin/applicant
portals). Update this file as milestones land.*
