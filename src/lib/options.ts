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
