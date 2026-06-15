/**
 * Seed the form-builder tables (form_sections / form_fields) so the dynamic
 * apply form reproduces the original hard-coded form exactly. Run once after
 * applying supabase/migrations/20260615_form_builder.sql.
 *
 * Run:
 *   pnpm tsx scripts/seed-form-config.ts            # seed only if empty
 *   pnpm tsx scripts/seed-form-config.ts --force    # wipe + reseed to defaults
 *
 * Idempotent: without --force it refuses to run when sections already exist
 * (so it never clobbers admin customizations). --force resets to defaults.
 *
 * Every seeded field carries column_map = its existing submissions column, so
 * core data still lands where vetting + the public databank expect it.
 */
import { createClient } from "@supabase/supabase-js";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// Mirror of src/lib/form-enums.ts InputType (inlined so the script has no
// alias/runtime import dependencies).
const T = {
  TEXT: 0,
  EMAIL: 1,
  URL: 2,
  PHONE: 3,
  NUMBER: 4,
  TEXTAREA: 5,
  SELECT: 6,
  MULTISELECT: 7,
  YES_NO: 8,
  RADIO_CARDS: 9,
  DATE: 10,
  GROUP: 20,
  HEADING: 30,
  FILE_UPLOAD: 90,
  CITY_COMPOSITE: 91,
} as const;

type FieldSeed = {
  key: string;
  label?: string;
  hint?: string;
  placeholder?: string;
  type: number;
  required?: boolean;
  validation?: Record<string, unknown>;
  options_source?: string;
  conditional?: { field_key: string; equals: unknown };
  column_map?: string | null; // default: same as key; null = answers/special
  repeatable?: boolean;
  min_items?: number;
  max_items?: number;
  item_label?: string;
};

type SectionSeed = {
  key: string;
  title: string;
  subtitle?: string;
  step: number;
  fields: FieldSeed[];
};

// A label-only divider field (HEADING) for visual sub-grouping within a step.
const heading = (key: string, label: string): FieldSeed => ({
  key,
  label,
  type: T.HEADING,
  column_map: null,
});

// ---------------------------------------------------------------------------
// The current form, expressed as config. SECTION = STEP (one section per step).
// Visual sub-groups (Basics, Location, …) are HEADING dividers; value fields
// stay flat so routing to columns + vetting is unchanged. Order == render order.
// ---------------------------------------------------------------------------
const SECTIONS: SectionSeed[] = [
  // ===== Step 1 — Startup =====
  {
    key: "startup",
    title: "Startup",
    subtitle: "About your company, where you operate, and how you reach customers",
    step: 1,
    fields: [
      heading("h_basics", "Basics"),
      { key: "startup_name", label: "Startup name", type: T.TEXT, required: true, validation: { minLength: 2 }, placeholder: "Acme Inc." },
      { key: "tagline", label: "Tagline", type: T.TEXT, placeholder: "One line on what you do" },
      { key: "website", label: "Website", type: T.URL, required: true, placeholder: "https://" },
      { key: "year_founded", label: "Year founded", type: T.TEXT, required: true, validation: { pattern: "^(19|20)\\d{2}$" }, placeholder: "2021" },
      { key: "description", label: "Brief description", type: T.TEXTAREA, required: true, validation: { minLength: 50, maxLength: 2000 }, hint: "At least 50 characters." },
      { key: "logo_url", label: "Startup logo", type: T.FILE_UPLOAD, validation: { bucket: "logos", maxSizeMB: 5, accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] } } },

      heading("h_location", "Location"),
      { key: "location", label: "Headquarters", type: T.CITY_COMPOSITE, column_map: null },

      heading("h_category", "Category"),
      { key: "primary_sector", label: "Primary sector", type: T.SELECT, required: true, options_source: "SECTORS", placeholder: "Pick a sector" },
      { key: "secondary_sector", label: "Secondary sector", type: T.TEXT },
      { key: "business_model", label: "Business model", type: T.SELECT, options_source: "BUSINESS_MODELS", placeholder: "Select…" },
      { key: "stage", label: "Current stage", type: T.SELECT, required: true, options_source: "STAGES", placeholder: "Pick a stage" },
      { key: "revenue_models", label: "Revenue model", type: T.MULTISELECT, options_source: "REVENUE_MODELS" },

      heading("h_team", "Team & Legal"),
      { key: "total_employees", label: "Total employees", type: T.NUMBER },
      { key: "female_employees", label: "Female employees", type: T.NUMBER },
      { key: "founding_team_composition", label: "Founding team composition", type: T.SELECT, options_source: "FOUNDING_TEAM_COMPOSITIONS", placeholder: "Select…" },
      { key: "fbr_registered", label: "FBR registration", type: T.YES_NO },
      { key: "secp_registered", label: "SECP registration", type: T.YES_NO },
      { key: "is_pasha_member", label: "P@SHA membership", type: T.YES_NO },

      heading("h_traction", "Traction & Funding"),
      { key: "revenue_band", label: "Current revenue", type: T.SELECT, options_source: "REVENUE_BANDS", placeholder: "Select…" },
      { key: "raised_funding", label: "Raised funding", type: T.YES_NO },
      { key: "funding_stage", label: "Funding stage", type: T.SELECT, options_source: "FUNDING_STAGES", placeholder: "Select…", conditional: { field_key: "raised_funding", equals: true } },
      { key: "currently_raising", label: "Currently raising", type: T.YES_NO },
      { key: "pitch_deck_url", label: "Pitch deck", type: T.FILE_UPLOAD, validation: { bucket: "pitch-decks", maxSizeMB: 4, accept: { "application/pdf": [".pdf"] } } },
      { key: "pitch_video", label: "Pitch video", type: T.URL, placeholder: "https://" },

      heading("h_incubation", "Incubation"),
      { key: "incubated_in_nic", label: "Incubation status", type: T.YES_NO },
      { key: "nic_name", label: "Incubation center", type: T.SELECT, options_source: "NIC_CENTERS", placeholder: "Select…", conditional: { field_key: "incubated_in_nic", equals: true } },
      { key: "nic_cohort", label: "Cohort", type: T.TEXT, conditional: { field_key: "incubated_in_nic", equals: true } },
      { key: "nic_year", label: "Incubation year", type: T.NUMBER, conditional: { field_key: "incubated_in_nic", equals: true } },

      heading("h_socials", "Socials"),
      { key: "company_linkedin", label: "Company LinkedIn", type: T.URL, placeholder: "https://" },
      { key: "company_x", label: "Company X / Twitter", type: T.URL, placeholder: "https://" },
      { key: "company_instagram", label: "Company Instagram", type: T.URL, placeholder: "https://" },
      { key: "company_facebook", label: "Company Facebook", type: T.URL, placeholder: "https://" },
      { key: "company_youtube", label: "Company YouTube", type: T.URL, placeholder: "https://" },
    ],
  },

  // ===== Step 2 — Founders =====
  {
    key: "founders",
    title: "Founders",
    subtitle: "The people running this startup — shown publicly as Key Persons",
    step: 2,
    fields: [
      { key: "founders", label: "Founders", type: T.GROUP, repeatable: true, min_items: 1, item_label: "Founder", column_map: "founders" },
    ],
  },

  // ===== Step 3 — Recognition =====
  {
    key: "recognition",
    title: "Recognition",
    subtitle: "Patents, awards, certifications, and community opt-ins",
    step: 3,
    fields: [
      heading("h_ip", "Intellectual property"),
      { key: "has_patents", label: "Patents or trademarks", type: T.YES_NO },
      { key: "patents_count", label: "Patent count", type: T.NUMBER, conditional: { field_key: "has_patents", equals: true } },

      heading("h_awards", "Awards & Certifications"),
      { key: "awards", label: "Awards & recognition", type: T.TEXTAREA },
      { key: "certifications", label: "Certifications", type: T.TEXTAREA },

      heading("h_engagement", "Engagement"),
      { key: "engagement_interests", label: "Engagement interests", type: T.MULTISELECT, options_source: "ENGAGEMENT_INTERESTS" },

      heading("h_community", "Community"),
      { key: "whatsapp_optin", label: "WhatsApp community", type: T.YES_NO },
      { key: "facebook_optin", label: "Facebook community", type: T.YES_NO },

      heading("h_closing", "Closing"),
      { key: "closing_notes", label: "Closing notes", type: T.TEXTAREA },
    ],
  },
];

async function main() {
  const force = process.argv.includes("--force");

  const { count } = await supabase
    .from("form_sections")
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) > 0 && !force) {
    console.error(
      `form_sections already has ${count} rows. Re-run with --force to wipe and reseed.`
    );
    process.exit(1);
  }

  if (force) {
    // ON DELETE CASCADE removes child form_fields with their sections.
    await supabase.from("form_fields").delete().not("id", "is", null);
    await supabase.from("form_sections").delete().not("id", "is", null);
    console.log("Wiped existing form config.");
  }

  let sectionOrder = 0;
  for (const section of SECTIONS) {
    const { data: secRow, error: secErr } = await supabase
      .from("form_sections")
      .insert({
        key: section.key,
        title: section.title,
        subtitle: section.subtitle ?? null,
        step: section.step,
        sort_order: sectionOrder++,
        is_active: true,
      })
      .select("id")
      .single();
    if (secErr || !secRow) {
      console.error(`Failed to insert section ${section.key}:`, secErr?.message);
      process.exit(1);
    }

    const rows = section.fields.map((f, i) => ({
      section_id: secRow.id,
      parent_field_id: null,
      field_key: f.key,
      label: f.label ?? null,
      hint: f.hint ?? null,
      placeholder: f.placeholder ?? null,
      input_type: f.type,
      required: f.required ?? false,
      validation: f.validation ?? {},
      options: null,
      options_source: f.options_source ?? null,
      repeatable: f.repeatable ?? false,
      min_items: f.min_items ?? null,
      max_items: f.max_items ?? null,
      item_label: f.item_label ?? null,
      column_map: f.column_map === undefined ? f.key : f.column_map,
      visible: true,
      sort_order: i,
      conditional: f.conditional ?? null,
    }));

    const { error: fieldErr } = await supabase.from("form_fields").insert(rows);
    if (fieldErr) {
      console.error(`Failed to insert fields for ${section.key}:`, fieldErr.message);
      process.exit(1);
    }
    console.log(`Seeded section "${section.title}" with ${rows.length} fields.`);
  }

  console.log(`\nDone. Seeded ${SECTIONS.length} sections.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
