# Project Goals

> Reference for AI agents and contributors. Keep this short and durable; put
> living status in `progress.md` and architecture detail in `docs/form-builder.md`.

## Standing goal: admin-configurable apply form

Make the public apply form (`/apply`) **fully admin-configurable** so admins —
not developers — control its structure, **without breaking the existing
dataset** or the systems that depend on specific fields.

Admins can define, from `/admin/forms`:
- **Sections = steps.** Each section is one wizard step. Add / reorder / rename.
- **Fields** within a step, each with an **int-based input type** (text, email,
  url, number, select, multiselect, yes/no, radio cards, date, file upload,
  city/country, heading divider, group).
- **Validations** per field (min/max, length, pattern, required, safe URL).
- **Repeatable subsections** (groups) — e.g. a "Members" group with min/max
  instances, each with its own fields (generalizes the founders repeater).

## Hard constraints (must not regress)
- **Existing dataset preserved.** Core fields keep a `column_map` to their
  existing `submissions` column. Admin-added fields go to `submissions.answers`
  (JSONB). No existing column is dropped or repurposed.
- **Vetting unchanged.** `src/lib/vetting.ts` still scores from the core columns.
- **Public directory unchanged.** Approval → `databank` materialization still
  reads the core columns.
- The form must keep working even before the form-builder tables are seeded
  (static fallback in `src/components/form/ApplyForm.tsx`).

## Out of scope (for now)
- Admin-added (non-core) fields feeding the vetting score.
- Admin-added fields shown on the public `/directory`.
- Config version history beyond `audit_log` diffs.
