// Profile-completion engine (spec §12 "Dashboard Workflow and Profile
// Completion"). Isomorphic — NO server-only imports — because it runs both
// server-side (api/submit gate + completion_score) and client-side (DynamicForm
// disables submit below 50%, the applicant dashboard renders the ladder).
//
// The criteria map onto the field_keys seeded by
// 20260621_full_application_form.sql (the 7-step application form).

import {
  stepsOf,
  sectionsForStep,
  CITY_COMPOSITE_KEYS,
  type FormConfig,
  type FormFieldConfig,
} from "./form-config";
import { InputType } from "./form-enums";

// A requirement is either a single field_key, or an "any of" group satisfied
// when at least one of its keys is filled.
type Req = string | string[];

export type LevelKey =
  | "draft"
  | "public_ready"
  | "business_complete"
  | "featured_eligible"
  | "investor_ready";

type LevelDef = {
  key: LevelKey;
  label: string;
  percent: number;
  benefit: string;
  fields: Req[];
};

/**
 * The five cumulative completion levels. "Cumulative" = to sit at a level you
 * must satisfy that level's own fields AND every lower level. `percent` is the
 * spec's headline number for the level.
 */
export const LEVELS: LevelDef[] = [
  {
    key: "draft",
    label: "Draft",
    percent: 25,
    benefit: "Account created — not yet public.",
    fields: ["startup_name", "primary_sector", "stage", ["hq_city", "hq_country"], "tagline"],
  },
  {
    key: "public_ready",
    label: "Public Profile Ready",
    percent: 50,
    benefit: "Eligible for admin review.",
    fields: ["logo_url", "description", "primary_sector", "stage", "business_model", "team_size"],
  },
  {
    key: "business_complete",
    label: "Business Profile Complete",
    percent: 75,
    benefit: "Better ranking and discovery.",
    fields: [
      "problem_statement",
      "solution_statement",
      "product_features",
      "usp",
      ["tam_amount", "sam_amount", "som_amount", "market_notes"],
      ["competitors_global", "competitors_pk"],
    ],
  },
  {
    key: "featured_eligible",
    label: "Featured Eligible",
    percent: 90,
    benefit: "Can apply for the featured section.",
    fields: [
      ["monthly_active_users", "num_customers", "revenue_band", "monthly_revenue_range"],
      "awards",
      "partnerships",
    ],
  },
  {
    key: "investor_ready",
    label: "Investor Ready",
    percent: 100,
    benefit: "Eligible for investor directory access.",
    fields: [["tam_amount", "sam_amount", "som_amount"], "funding_status", "pitch_deck_url", "contact_preference"],
  },
];

// Fallback friendly labels for the level field_keys — used in the "what's
// left" hints ONLY when the live form config doesn't supply a label (callers
// pass the builder's field labels into computeCompletion; see `labels` param).
const LABELS: Record<string, string> = {
  startup_name: "Startup name",
  tagline: "One-line description",
  description: "Detailed description",
  logo_url: "Startup logo",
  primary_sector: "Primary sector",
  stage: "Current stage",
  business_model: "Business model",
  team_size: "Team size",
  hq_city: "City",
  hq_country: "Country",
  problem_statement: "Problem",
  solution_statement: "Solution",
  product_features: "Key product features",
  usp: "USP / differentiator",
  gtm_channels: "GTM channels",
  product_maturity: "Product maturity",
  tam_amount: "TAM",
  sam_amount: "SAM",
  som_amount: "SOM",
  market_notes: "Market sizing notes",
  competitors_global: "Global competitors",
  competitors_pk: "Pakistan competitors",
  monthly_active_users: "Monthly active users",
  num_customers: "Number of customers",
  revenue_band: "Annual revenue range",
  monthly_revenue_range: "Monthly revenue range",
  awards: "Awards & recognition",
  partnerships: "Partnerships",
  funding_status: "Funding status",
  total_funding_raised: "Total funding raised",
  pitch_deck_url: "Pitch deck",
  contact_preference: "Public contact preference",
  open_to_investor_contact: "Open to investor contact",
  founders: "Founders",
  total_employees: "Total employees",
  founder_bio: "Founder bio",
  women_led: "Women-led",
  currently_hiring: "Currently hiring",
  looking_for_partnerships: "Looking for partnerships",
  operating_markets: "Operating markets",
};

export function labelForKey(key: string): string {
  return LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Is a value meaningfully filled? Empty string / empty array / NaN / false /
 * null all count as empty. Objects and arrays recurse (so a `founders` array of
 * objects counts as filled when any nested value is present).
 */
export function isFilled(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "boolean") return v === true;
  if (Array.isArray(v)) return v.some(isFilled);
  if (typeof v === "object") return Object.values(v as Record<string, unknown>).some(isFilled);
  return Boolean(v);
}

// A single requirement is satisfied when its field (or any field in an
// any-of group) is filled.
function reqMet(req: Req, data: Record<string, unknown>): boolean {
  if (Array.isArray(req)) return req.some((k) => isFilled(data[k]));
  return isFilled(data[req]);
}

// The representative key of a requirement (first key of an any-of group).
function reqKey(req: Req): string {
  return Array.isArray(req) ? req[0] : req;
}

export type CompletionLevel = {
  key: LevelKey;
  label: string;
  percent: number;
  benefit: string;
  met: boolean;
  filled: number;
  total: number;
};

export type Completion = {
  /** Headline percent — the highest fully-met level's percent (0 if none). */
  percent: number;
  levelKey: LevelKey | null;
  levelLabel: string;
  benefit: string;
  /** First level not yet met (+ its missing requirements), or null at 100%. */
  nextLevel: { key: LevelKey; label: string; percent: number; missing: { key: string; label: string }[] } | null;
  levels: CompletionLevel[];
  /** Spec gate: Public Profile Ready (50%) reached. */
  publicProfileMet: boolean;
  /** The 50%-level requirements still missing (for the submit-gate hint). */
  publicProfileMissing: { key: string; label: string }[];
};

function missingOf(
  fields: Req[],
  data: Record<string, unknown>,
  resolveLabel: (key: string) => string
): { key: string; label: string }[] {
  return fields
    .filter((f) => !reqMet(f, data))
    .map((f) => ({ key: reqKey(f), label: resolveLabel(reqKey(f)) }));
}

/**
 * Compute the §12 completion ladder from a flat values record (draft.data or a
 * submitted submission's data). Pass `labels` (field_key → label, built from the
 * live form config) so the "what's still needed" hints show the builder's own
 * field labels; we only fall back to the built-in names when a key is absent.
 */
export function computeCompletion(
  data: Record<string, unknown> | null | undefined,
  labels?: Record<string, string>
): Completion {
  const d = data ?? {};
  const resolveLabel = (key: string) => labels?.[key] ?? labelForKey(key);

  // Per-level own-satisfaction + counts.
  const ownMet: boolean[] = [];
  const levels: CompletionLevel[] = LEVELS.map((lvl, i) => {
    const filled = lvl.fields.filter((f) => reqMet(f, d)).length;
    const total = lvl.fields.length;
    const selfMet = filled === total;
    ownMet[i] = selfMet;
    return {
      key: lvl.key,
      label: lvl.label,
      percent: lvl.percent,
      benefit: lvl.benefit,
      met: false, // set below (cumulative)
      filled,
      total,
    };
  });

  // Cumulative: a level is "met" only if it and all lower levels are met.
  let highest = -1;
  for (let i = 0; i < LEVELS.length; i++) {
    const cumulative = ownMet.slice(0, i + 1).every(Boolean);
    levels[i].met = cumulative;
    if (cumulative) highest = i;
  }

  const current = highest >= 0 ? LEVELS[highest] : null;
  const nextIdx = highest + 1;
  const next =
    nextIdx < LEVELS.length
      ? {
          key: LEVELS[nextIdx].key,
          label: LEVELS[nextIdx].label,
          percent: LEVELS[nextIdx].percent,
          missing: missingOf(LEVELS[nextIdx].fields, d, resolveLabel),
        }
      : null;

  const publicLevel = LEVELS.find((l) => l.key === "public_ready")!;
  const publicProfileMet = levels.find((l) => l.key === "public_ready")!.met;

  return {
    percent: current?.percent ?? 0,
    levelKey: current?.key ?? null,
    levelLabel: current?.label ?? "Getting started",
    benefit: current?.benefit ?? "Add your basics to reach Draft (25%).",
    nextLevel: next,
    levels,
    publicProfileMet,
    publicProfileMissing: missingOf(publicLevel.fields, d, resolveLabel),
  };
}

/**
 * field_key → label from the live form config, so completion hints use the
 * builder's own field names (not the built-in fallback list).
 */
export function fieldLabelMap(config: FormConfig): Record<string, string> {
  const map: Record<string, string> = {};
  for (const section of config) {
    for (const f of section.fields) {
      if (f.label) map[f.field_key] = f.label;
    }
  }
  return map;
}

// Is a single config field filled in `data`? CITY_COMPOSITE checks its expanded
// keys; everything else reads its field_key.
function fieldFilled(field: FormFieldConfig, data: Record<string, unknown>): boolean {
  if (field.input_type === InputType.CITY_COMPOSITE) {
    return CITY_COMPOSITE_KEYS.some((k) => isFilled(data[k]));
  }
  return isFilled(data[field.field_key]);
}

export type FormModule = {
  /** 0-based step index — matches DynamicForm's step index for ?step= links. */
  step: number;
  title: string;
  subtitle: string;
  filled: number;
  total: number;
  percent: number;
};

/**
 * Build dashboard modules that mirror the application form's actual steps
 * (title + subtitle from the first section of each step, progress over the
 * step's visible value fields). Keeps the dashboard in sync with the builder.
 */
export function computeFormModules(
  config: FormConfig,
  data: Record<string, unknown> | null | undefined
): FormModule[] {
  const d = data ?? {};
  return stepsOf(config).map((stepNum, idx) => {
    const sections = sectionsForStep(config, stepNum);
    const first = sections[0];
    let filled = 0;
    let total = 0;
    for (const section of sections) {
      for (const f of section.fields) {
        if (f.input_type === InputType.HEADING) continue; // visual only
        if (f.visible === false) continue; // hidden — not shown in the step
        total += 1;
        if (fieldFilled(f, d)) filled += 1;
      }
    }
    return {
      step: idx,
      title: first?.title ?? `Step ${stepNum}`,
      subtitle: first?.subtitle ?? "",
      filled,
      total,
      percent: total === 0 ? 0 : Math.round((filled / total) * 100),
    };
  });
}
