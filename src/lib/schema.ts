import { z } from "zod";

// ---------------------------------------------------------------------------
// Permissive optionals
// Zod 4 requires .optional() chained explicitly after preprocess() so an
// undefined output from the preprocessor passes downstream validation cleanly.
// ---------------------------------------------------------------------------

const optionalString = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    return String(v).trim();
  },
  z.string().min(1).optional()
);

// Strict URL: only http/https schemes. Rejects javascript:, data:, vbscript:,
// file:, etc. Used for any URL field rendered later as an <a href>.
const SAFE_URL_RE = /^https?:\/\/[^\s<>"]+$/i;

const optionalSafeUrl = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    return String(v).trim();
  },
  z
    .string()
    .min(1)
    .refine((u) => SAFE_URL_RE.test(u), {
      message: "Must be a valid http or https URL",
    })
    .optional()
);

// REQUIRED URL — same validation, but emits an error when missing.
const requiredSafeUrl = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return "";
    return String(v).trim();
  },
  z
    .string()
    .min(1, "Required")
    .refine((u) => SAFE_URL_RE.test(u), {
      message: "Must be a valid http or https URL",
    })
);

const optionalNumber = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    const n = typeof v === "string" ? Number(v) : v;
    if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
    return Math.floor(n);
  },
  z.number().int().min(0).optional()
);

const optionalBool = z.preprocess(
  (v) => {
    if (v === true || v === "true" || v === 1 || v === "1") return true;
    if (v === false || v === "false" || v === 0 || v === "0") return false;
    return undefined;
  },
  z.boolean().optional()
);

const optionalArray = z.preprocess(
  (v) => {
    if (Array.isArray(v)) {
      return v.filter((x) => x !== null && x !== undefined && x !== "");
    }
    return [];
  },
  z.array(z.string()).default([])
);

// ---------------------------------------------------------------------------
// Founder (one entry in the founders[] array). The first entry is the
// primary submitter — name/role/email/mobile required. Subsequent entries
// only require name + role; everything else is optional so adding a third
// cofounder isn't blocked by missing contact info.
// ---------------------------------------------------------------------------

// Optional custom links per founder — e.g. personal site, GitHub, Substack.
// Each entry: { label, url }. Stored inside the founders JSONB.
const founderCustomLink = z.object({
  label: z.string().trim().min(1, "Label required"),
  url: optionalSafeUrl,
});

const founderSchema = z.object({
  name: z.string().trim().min(2, "Founder name required"),
  role: z.string().trim().min(2, "Role required (e.g. CEO, CTO)"),
  email: z.preprocess(
    (v) => (v === "" || v == null ? undefined : String(v).trim()),
    z.string().email("Valid email required").optional()
  ),
  mobile: optionalString,
  linkedin: optionalSafeUrl,
  // Founder-level socials. LinkedIn was always here; X/Instagram/Facebook
  // are now first-class. custom_links lets a founder add any other URL with
  // a short label (GitHub, personal blog, etc.).
  x: optionalSafeUrl,
  instagram: optionalSafeUrl,
  facebook: optionalSafeUrl,
  custom_links: z
    .preprocess(
      (v) =>
        Array.isArray(v)
          ? v.filter(
              (e) =>
                e &&
                typeof e === "object" &&
                ((e as Record<string, unknown>).label ||
                  (e as Record<string, unknown>).url)
            )
          : [],
      z.array(founderCustomLink).default([])
    ),
  photo_url: optionalSafeUrl,
  gender: optionalString,
  is_primary: z.boolean().default(false),
});

export type Founder = z.infer<typeof founderSchema>;

const foundersArray = z
  .array(founderSchema)
  .min(1, "At least one founder required")
  .superRefine((arr, ctx) => {
    // .min(1) above prevents the rest from running on empty arrays, but be
    // defensive — superRefine shouldn't crash on edge inputs.
    if (!Array.isArray(arr) || arr.length === 0) return;

    // Exactly one primary; if none marked, the first becomes primary.
    const primaryCount = arr.filter((f) => f.is_primary).length;
    if (primaryCount === 0) arr[0].is_primary = true;

    const primary = arr.find((f) => f.is_primary) ?? arr[0];
    if (!primary) return;
    if (!primary.email) {
      ctx.addIssue({
        code: "custom",
        message: "Primary founder must have an email",
        path: [arr.indexOf(primary), "email"],
      });
    }
    if (!primary.mobile) {
      ctx.addIssue({
        code: "custom",
        message: "Primary founder must have a mobile number",
        path: [arr.indexOf(primary), "mobile"],
      });
    }
  });

// ---------------------------------------------------------------------------
// Main submission schema (v2). Three logical sections (Startup / Founders /
// Recognition) — see stepFields for the per-step slices.
// ---------------------------------------------------------------------------

export const submissionSchema = z
  .object({
    // ====== Startup — basics
    startup_name: z.string().trim().min(2, "Required"),
    tagline: optionalString,
    website: requiredSafeUrl, // NEW REQUIRED
    year_founded: z
      .preprocess(
        (v) => (v === "" || v == null ? "" : String(v).trim()),
        z.string().regex(/^(19|20)\d{2}$/, "Pick a year between 1900 and 2099")
      ),
    description: z.string().trim().min(50, "At least 50 characters").max(2000),
    logo_url: optionalSafeUrl,

    // ====== Startup — location
    hq_city: optionalString, // top-20 PK city, OR "Other"; required only if !outside_pakistan
    hq_other: optionalString,
    outside_pakistan: z.boolean().default(false),
    hq_country: optionalString, // required only if outside_pakistan === true

    // ====== Startup — category
    primary_sector: z.preprocess(
      (v) => (v === "" || v == null ? "" : String(v).trim()),
      z.string().min(1, "Pick a sector")
    ),
    secondary_sector: optionalString,
    business_model: optionalString,
    stage: z.preprocess(
      (v) => (v === "" || v == null ? "" : String(v).trim()),
      z.string().min(1, "Pick a stage")
    ),
    revenue_models: optionalArray,

    // ====== Startup — team & legal
    total_employees: optionalNumber,
    female_employees: optionalNumber,
    founding_team_composition: optionalString,
    fbr_registered: optionalBool,
    secp_registered: optionalBool,
    // P@SHA membership moved here from the Founders step. Lives next to the
    // FBR / SECP yes-no toggles which it pairs with logically.
    is_pasha_member: optionalBool,

    // ====== Startup — traction & funding
    revenue_band: optionalString,
    raised_funding: optionalBool,
    funding_stage: optionalString,
    currently_raising: optionalBool,
    pitch_deck_url: optionalSafeUrl,
    pitch_video: optionalSafeUrl,

    // ====== Startup — incubation
    incubated_in_nic: optionalBool,
    nic_name: optionalString,
    nic_cohort: optionalString,
    nic_year: optionalNumber,

    // ====== Startup — socials (new)
    company_linkedin: optionalSafeUrl,
    company_x: optionalSafeUrl,
    company_instagram: optionalSafeUrl,
    company_facebook: optionalSafeUrl,
    company_youtube: optionalSafeUrl,

    // ====== Founders (step 2) — total_founders / female_founders dropped;
    // both are derivable from the founders array (count and gender filter).
    // is_pasha_member moved to Step 1 (team & legal).
    founders: foundersArray,

    // ====== Recognition & Community (step 3)
    has_patents: optionalBool,
    patents_count: optionalNumber,
    awards: optionalString,
    certifications: optionalString,
    engagement_interests: optionalArray,
    whatsapp_optin: z.boolean().default(false),
    facebook_optin: z.boolean().default(false),
    closing_notes: optionalString,
  })
  .superRefine((data, ctx) => {
    // City vs country mutual exclusivity.
    if (data.outside_pakistan) {
      if (!data.hq_country || !data.hq_country.trim()) {
        ctx.addIssue({ code: "custom", message: "Pick a country", path: ["hq_country"] });
      }
    } else {
      if (!data.hq_city || !data.hq_city.trim()) {
        ctx.addIssue({ code: "custom", message: "Pick a city", path: ["hq_city"] });
      }
      if (data.hq_city === "Other" && (!data.hq_other || !data.hq_other.trim())) {
        ctx.addIssue({ code: "custom", message: "Enter your city", path: ["hq_other"] });
      }
    }
  });

export type SubmissionInput = z.infer<typeof submissionSchema>;

// ---------------------------------------------------------------------------
// Step partitioning. Each step's `goNext` calls form.trigger(stepFields[step])
// before advancing so step-level errors surface inline.
//
// NOTE: paths inside founders[] are reached via "founders" — RHF's trigger
// validates the whole array, which is what we want at the step-2 boundary.
// ---------------------------------------------------------------------------

export const stepFields: Record<number, (keyof SubmissionInput)[]> = {
  1: [
    "startup_name",
    "tagline",
    "website",
    "year_founded",
    "description",
    "logo_url",
    "hq_city",
    "hq_other",
    "outside_pakistan",
    "hq_country",
    "primary_sector",
    "secondary_sector",
    "business_model",
    "stage",
    "revenue_models",
    "total_employees",
    "female_employees",
    "founding_team_composition",
    "fbr_registered",
    "secp_registered",
    "is_pasha_member",
    "revenue_band",
    "raised_funding",
    "funding_stage",
    "currently_raising",
    "pitch_deck_url",
    "pitch_video",
    "incubated_in_nic",
    "nic_name",
    "nic_cohort",
    "nic_year",
    "company_linkedin",
    "company_x",
    "company_instagram",
    "company_facebook",
    "company_youtube",
  ],
  2: ["founders"],
  3: [
    "has_patents",
    "patents_count",
    "awards",
    "certifications",
    "engagement_interests",
    "whatsapp_optin",
    "facebook_optin",
    "closing_notes",
  ],
};

export const stepTitles = [
  { num: 1, title: "Startup", subtitle: "About your company, where you operate, and how you reach customers" },
  { num: 2, title: "Founders", subtitle: "The people running this startup — shown publicly as Key Persons" },
  { num: 3, title: "Recognition", subtitle: "Patents, awards, certifications, and community opt-ins" },
] as const;
