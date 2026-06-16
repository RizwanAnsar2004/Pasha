// Shared option lists for form + admin

// Top-20 Pakistani cities by population + tech-startup density.
// The form's CityField shows these in a dropdown, plus an "Other (specify)"
// entry that reveals a text input (writes to `hq_other`).
// "Outside Pakistan" is its own checkbox (not a city) — when checked, the
// city dropdown hides and a country picker appears.
export const HQ_CITIES = [
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Sialkot",
  "Gujranwala",
  "Hyderabad",
  "Bahawalpur",
  "Sargodha",
  "Sukkur",
  "Mardan",
  "Mirpur",
  "Abbottabad",
  "Larkana",
  "Sheikhupura",
  "Rahim Yar Khan",
  "Other",
] as const;

export const STAGES = [
  { value: "ideation", label: "Ideation — researching target audience and PMF" },
  { value: "dev_launch", label: "Development & Launch — building MVP or seeking initial traction" },
  { value: "early", label: "Early Stage — generating revenue and acquiring customers" },
  { value: "growth", label: "Growth & Maturity — stable profits, scaling and expansion" },
] as const;

export const BUSINESS_MODELS = [
  "Consumer Centric",
  "Business to Business (B2B)",
  "Business to Consumer (B2C)",
  "Business to Business to Consumer (B2B2C)",
  "Business to Government (B2G)",
  "Consumer to Consumer (C2C)",
  "Consumer to Business (C2B)",
  "Peer to Peer (P2P)",
] as const;

export const REVENUE_MODELS = [
  "Subscription",
  "Freemium",
  "Affiliate or Channel",
  "Razor and blades",
  "Reverse Razor & Blades",
  "Pay-As-You-Go (PAYG)",
  "Fee for Service",
  "Lock-in",
  "Licensing",
  "Ad-Based Revenue Model",
  "Transactional Revenue Model",
  "Commission Marketplace",
  "Markup Revenue Model",
  "Donations",
  "Direct Sales",
] as const;

export const SECTORS = [
  "Artificial Intelligence (AI)",
  "Blockchain Technology",
  "Cybersecurity",
  "SaaS",
  "Fintech",
  "HealthTech",
  "EdTech",
  "AgriTech",
  "HR Tech",
  "PropTech",
  "E-Commerce",
  "Q-Commerce",
  "Mobility & Supply Chain",
  "Femtech",
  "BeautyTech",
  "FashionTech",
  "Travel and Hospitality Tech",
  "CleanTech",
  "WellnessTech",
  "Marketing & AdTech",
  "Augmented Reality & Virtual Reality (AR/VR)",
  "Hardware (Manufacturing or Installing)",
  "BioTech",
  "Internet of Things (IOT)",
  "Gaming and Esports",
  "Other",
] as const;

export const FUNDING_STAGES = [
  "Bootstrapped",
  "Angel",
  "Pre-seed",
  "Seed",
  "Seed A",
  "Seed B",
  "Seed C & Beyond",
  "Corporate Funding",
  "Accelerate Round",
  "Crowd Funding",
  "Other",
] as const;

export const REVENUE_BANDS = [
  { value: "0", label: "Pre-revenue" },
  { value: "<10k", label: "Under $10K / year" },
  { value: "10k-50k", label: "$10K – $50K / year" },
  { value: "50k-250k", label: "$50K – $250K / year" },
  { value: "250k-1m", label: "$250K – $1M / year" },
  { value: ">1m", label: "$1M+ / year" },
] as const;

export const CUSTOMER_BANDS = [
  { value: "0", label: "None yet" },
  { value: "1-10", label: "1 – 10" },
  { value: "11-100", label: "11 – 100" },
  { value: "101-1k", label: "101 – 1,000" },
  { value: "1k-10k", label: "1K – 10K" },
  { value: ">10k", label: "10K+" },
] as const;

export const FOUNDING_TEAM_COMPOSITIONS = [
  { value: "all_male", label: "All founders are male" },
  { value: "mixed", label: "Mixed-gender founding team (at least one female founder)" },
  { value: "all_female", label: "All founders are female" },
] as const;

export const FOUNDER_GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export const ENGAGEMENT_INTERESTS = [
  "Mentorship (receive)",
  "Mentoring fresh graduates",
  "Investor introductions",
  "Speaking & panels",
  "Pitch competition judging",
  "Open to mentor other founders",
] as const;

export const NIC_CENTERS = [
  "NIC Karachi",
  "NIC Lahore",
  "NIC Islamabad",
  "NIC Peshawar",
  "NIC Quetta",
  "NIC Faisalabad",
  "NIC Hyderabad",
  "Plan9 PITB",
  "LUMS LCE",
  "Other",
] as const;

// ---------------------------------------------------------------------------
// Spec §4–§11 dropdowns (post-login profile completion). These power the full
// application form built by 20260621_full_application_form.sql.
// ---------------------------------------------------------------------------

// §11 / §4 — startup maturity filter.
export const TEAM_SIZES = [
  "1-5",
  "6-10",
  "11-25",
  "26-50",
  "51-100",
  "100+",
] as const;

// §4 — public contact preference.
export const CONTACT_PREFERENCES = [
  { value: "contact_form", label: "Contact form only (recommended)" },
  { value: "show_email", label: "Show email publicly" },
  { value: "show_phone", label: "Show phone publicly" },
  { value: "hide", label: "Hide contact details" },
] as const;

// §6 — product maturity.
export const PRODUCT_MATURITY = [
  { value: "idea", label: "Idea" },
  { value: "prototype", label: "Prototype" },
  { value: "mvp", label: "MVP" },
  { value: "live", label: "Live product" },
  { value: "scaling", label: "Scaling" },
  { value: "enterprise", label: "Enterprise-ready" },
] as const;

// §6 — target customer segments.
export const TARGET_CUSTOMERS = [
  "Consumers",
  "SMEs",
  "Enterprise",
  "Banks & financial institutions",
  "Schools & universities",
  "Government",
  "Healthcare providers",
  "Other",
] as const;

// §6 — sales / go-to-market channels.
export const GTM_CHANNELS = [
  "Direct sales",
  "Digital / online marketing",
  "Partnerships & channel",
  "Marketplaces",
  "Retail / distribution",
  "Referral / word of mouth",
  "Events & community",
] as const;

// §8 — monthly recurring revenue range (use ranges, not exact figures).
export const MONTHLY_REVENUE_RANGES = [
  { value: "0", label: "Pre-revenue" },
  { value: "<1k", label: "Under $1K / month" },
  { value: "1k-10k", label: "$1K – $10K / month" },
  { value: "10k-50k", label: "$10K – $50K / month" },
  { value: "50k-250k", label: "$50K – $250K / month" },
  { value: ">250k", label: "$250K+ / month" },
  { value: "na", label: "Prefer not to disclose" },
] as const;

// §8 — funding status.
export const FUNDING_STATUS = [
  "Bootstrapped",
  "Grant-funded",
  "Angel-funded",
  "VC-funded",
  "Corporate-backed",
  "Not disclosed",
] as const;

// §8 — funding amount ranges (raised / raising). Investor-discovery use only.
export const FUNDING_AMOUNT_RANGES = [
  { value: "0", label: "None" },
  { value: "<50k", label: "Under $50K" },
  { value: "50k-250k", label: "$50K – $250K" },
  { value: "250k-1m", label: "$250K – $1M" },
  { value: "1m-5m", label: "$1M – $5M" },
  { value: ">5m", label: "$5M+" },
  { value: "na", label: "Prefer not to disclose" },
] as const;

// §9 — operating markets (multi-select).
export const OPERATING_MARKETS = [
  "Pakistan",
  "GCC / Middle East",
  "North America",
  "Europe / EU",
  "United Kingdom",
  "Africa",
  "Southeast Asia",
  "Other",
] as const;

// §9 — office / work model.
export const OFFICE_TYPES = [
  { value: "remote", label: "Fully remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "physical", label: "Physical office" },
] as const;

// §9 — women ownership percentage band (private by default).
export const WOMEN_OWNERSHIP_RANGES = [
  { value: "0", label: "0%" },
  { value: "1-25", label: "1 – 25%" },
  { value: "26-50", label: "26 – 50%" },
  { value: "51-75", label: "51 – 75%" },
  { value: "76-100", label: "76 – 100%" },
  { value: "na", label: "Prefer not to disclose" },
] as const;

// Named registry so a form_fields row can reference a centrally-maintained
// option list by name (options_source) instead of duplicating it in the DB.
// The dynamic renderer + buildZodSchema resolve a field's options from here
// when options_source is set and options is empty.
export type OptionList = readonly string[] | readonly { value: string; label: string }[];

export const OPTION_LISTS: Record<string, OptionList> = {
  HQ_CITIES,
  STAGES,
  BUSINESS_MODELS,
  REVENUE_MODELS,
  SECTORS,
  FUNDING_STAGES,
  REVENUE_BANDS,
  CUSTOMER_BANDS,
  FOUNDING_TEAM_COMPOSITIONS,
  FOUNDER_GENDERS,
  ENGAGEMENT_INTERESTS,
  NIC_CENTERS,
  // Spec §4–§11 profile dropdowns
  TEAM_SIZES,
  CONTACT_PREFERENCES,
  PRODUCT_MATURITY,
  TARGET_CUSTOMERS,
  GTM_CHANNELS,
  MONTHLY_REVENUE_RANGES,
  FUNDING_STATUS,
  FUNDING_AMOUNT_RANGES,
  OPERATING_MARKETS,
  OFFICE_TYPES,
  WOMEN_OWNERSHIP_RANGES,
};

// Normalize any option list to {value,label}[] for rendering.
export function normalizeOptions(
  list: OptionList | null | undefined
): { value: string; label: string }[] {
  if (!list) return [];
  return list.map((o) =>
    typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label }
  );
}
