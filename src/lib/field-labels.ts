// Human-readable labels for form fields. Used in the friendly error banner
// so users see "Email address" not "founder_email", and "Primary founder's
// LinkedIn" not "founders.0.linkedin".
//
// labelFor() also resolves dotted RHF paths like `founders.0.role` → "Role
// (founder #1)". This keeps the validation error banner readable even after
// the v2 founders array.

import type { SubmissionInput } from "./schema";

export const FIELD_LABELS: Record<string, string> = {
  // ---- Startup — basics
  startup_name: "Startup name",
  tagline: "Tagline",
  website: "Website",
  year_founded: "Year founded",
  description: "Brief description",
  logo_url: "Startup logo",

  // ---- Startup — location
  hq_city: "HQ city",
  hq_other: "Other city",
  outside_pakistan: "Outside Pakistan",
  hq_country: "Country",

  // ---- Startup — category
  primary_sector: "Primary sector",
  secondary_sector: "Secondary sector",
  business_model: "Business model",
  stage: "Current stage",
  revenue_models: "Revenue model",

  // ---- Startup — team & legal
  total_employees: "Total employees",
  female_employees: "Female employees",
  founding_team_composition: "Founding team composition",
  fbr_registered: "FBR registration",
  secp_registered: "SECP registration",

  // ---- Startup — traction & funding
  revenue_band: "Current revenue",
  raised_funding: "Raised funding",
  funding_stage: "Funding stage",
  currently_raising: "Currently raising",
  pitch_deck_url: "Pitch deck",
  pitch_video: "Pitch video",

  // ---- Startup — incubation
  incubated_in_nic: "Incubation status",
  nic_name: "Incubation center",
  nic_cohort: "Cohort",
  nic_year: "Incubation year",

  // ---- Startup — socials
  company_linkedin: "Company LinkedIn",
  company_x: "Company X / Twitter",
  company_instagram: "Company Instagram",
  company_facebook: "Company Facebook",
  company_youtube: "Company YouTube",

  // ---- Founders
  founders: "Founders",
  is_pasha_member: "P@SHA membership",

  // ---- Recognition & community
  has_patents: "Patents or trademarks",
  patents_count: "Patent count",
  awards: "Awards & recognition",
  certifications: "Certifications",
  engagement_interests: "Engagement interests",
  whatsapp_optin: "WhatsApp community",
  facebook_optin: "Facebook community",
  closing_notes: "Closing notes",
};

const FOUNDER_FIELD_LABELS: Record<string, string> = {
  name: "Name",
  role: "Role",
  email: "Email",
  mobile: "Mobile",
  linkedin: "LinkedIn",
  x: "X / Twitter",
  instagram: "Instagram",
  facebook: "Facebook",
  custom_links: "Custom links",
  photo_url: "Photo",
  gender: "Gender",
  is_primary: "Primary contact",
};

export function labelFor(field: string): string {
  // Dotted RHF path like "founders.0.role" → "Role (founder #1)"
  const founderPath = field.match(/^founders\.(\d+)\.(.+)$/);
  if (founderPath) {
    const [, idx, prop] = founderPath;
    const human = FOUNDER_FIELD_LABELS[prop] ?? prop;
    return `${human} (founder #${Number(idx) + 1})`;
  }
  return FIELD_LABELS[field as keyof SubmissionInput] ?? field;
}
