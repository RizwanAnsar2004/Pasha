import { z } from "zod";
import { isValidPhone, PHONE_VALIDATION_MESSAGE } from "@/lib/validators/phone";
import { isOtherChoice, isOtherPicked } from "@/lib/options/choice";

// ---------------------------------------------------------------------------

// NOTE: these preprocessors are exported so the dynamic form builder
export const optionalString = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    return String(v).trim();
  },
  z.string().min(1).optional()
);

// Strict URL: only http/https schemes. Rejects javascript:, data:, vbscript:,
export const SAFE_URL_RE = /^https?:\/\/[^\s<>"]+$/i;

export const optionalPhone = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    return String(v).trim();
  },
  z
    .string()
    .min(1)
    .refine(isValidPhone, { message: PHONE_VALIDATION_MESSAGE })
    .optional()
);

export const requiredPhone = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return "";
    return String(v).trim();
  },
  z.string().min(1, "Required").refine(isValidPhone, { message: PHONE_VALIDATION_MESSAGE })
);

export const optionalSafeUrl = z.preprocess(
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
export const requiredSafeUrl = z.preprocess(
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

export const optionalNumber = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    const n = typeof v === "string" ? Number(v) : v;
    if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
    return Math.floor(n);
  },
  z.number().int().min(0).optional()
);

export const optionalBool = z.preprocess(
  (v) => {
    if (v === true || v === "true" || v === 1 || v === "1") return true;
    if (v === false || v === "false" || v === 0 || v === "0") return false;
    return undefined;
  },
  z.boolean().optional()
);

export const optionalArray = z.preprocess(
  (v) => {
    if (Array.isArray(v)) {
      return v.filter((x) => x !== null && x !== undefined && x !== "");
    }
    return [];
  },
  z.array(z.string()).default([])
);

// ---------------------------------------------------------------------------

// Optional custom links per founder — e.g. personal site, GitHub, Substack.
// A row is only kept when the applicant typed something into it (see the
// preprocess on `custom_links` below), and once kept both halves are required —
// a label with no URL renders as a dead link on the public profile.
const founderCustomLink = z.object({
  label: z.string().trim().min(1, "Label required"),
  url: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? "" : String(v).trim()),
    z
      .string()
      .min(1, "URL required")
      .refine((u) => SAFE_URL_RE.test(u), {
        message: "Must be a valid http or https URL",
      })
  ),
});

export const founderSchema = z.object({
  name: z.string().trim().min(2, "Founder name required"),
  role: z.string().trim().min(2, "Role required (e.g. CEO, CTO)"),
  email: z.preprocess(
    (v) => (v === "" || v == null ? undefined : String(v).trim()),
    z.string().email("Valid email required").optional()
  ),
  mobile: optionalPhone,
  linkedin: optionalSafeUrl,
  // Founder-level socials. LinkedIn was always here; X/Instagram/Facebook
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

export const foundersArray = z
  .array(founderSchema)
  .min(1, "At least one founder required")
  .superRefine((arr, ctx) => {
    // .min(1) above prevents the rest from running on empty arrays, but be
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

export function yearFoundedFutureMessage(): string {
  return `Year cannot be after ${new Date().getFullYear()}`;
}

export const submissionSchema = z
  .object({
    // ====== Startup — basics
    startup_name: z.string().trim().min(2, "Required"),
    tagline: optionalString,
    website: requiredSafeUrl, // NEW REQUIRED
    year_founded: z
      .preprocess(
        (v) => (v === "" || v == null ? "" : String(v).trim()),
        z
          .string()
          .regex(/^(19|20)\d{2}$/, "Pick a year between 1900 and 2099")
          .refine((y) => Number(y) <= new Date().getFullYear(), {
            message: yearFoundedFutureMessage(),
          })
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

    // Free text captured when the paired choice above is "Other", so the real
    primary_sector_other: optionalString,
    business_model_other: optionalString,
    stage_other: optionalString,
    revenue_models_other: optionalString,

    // ====== Startup — team & legal
    total_employees: optionalNumber,
    female_employees: optionalNumber,
    founding_team_composition: optionalString,
    fbr_registered: optionalBool,
    secp_registered: optionalBool,
    // PASHA membership moved here from the Founders step. Lives next to the
    is_pasha_member: optionalBool,

    // ====== Startup — traction & funding
    revenue_band: optionalString,
    raised_funding: optionalBool,
    funding_stage: optionalString,
    funding_stage_other: optionalString,
    currently_raising: optionalBool,
    pitch_deck_url: optionalSafeUrl,
    pitch_video: optionalSafeUrl,

    // ====== Startup — incubation
    incubated_in_nic: optionalBool,
    nic_name: optionalString,
    nic_name_other: optionalString,
    nic_cohort: optionalString,
    nic_year: optionalNumber,

    // ====== Startup — socials (new)
    company_linkedin: optionalSafeUrl,
    company_x: optionalSafeUrl,
    company_instagram: optionalSafeUrl,
    company_facebook: optionalSafeUrl,
    company_youtube: optionalSafeUrl,

    // ====== Founders (step 2) — total_founders / female_founders dropped;
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
    applyCityCountryRefine(data, ctx);
    applyOtherRefine(data as Record<string, unknown>, ctx, OTHER_TEXT_FIELDS);
    if (typeof data.total_employees === "number" && data.total_employees < 1) {
      ctx.addIssue({ code: "custom", message: "Must be greater than 0", path: ["total_employees"] });
    }
    if (typeof data.female_employees === "number" && data.female_employees < 1) {
      ctx.addIssue({ code: "custom", message: "Must be greater than 0", path: ["female_employees"] });
    }
    if (
      typeof data.female_employees === "number" &&
      typeof data.total_employees === "number" &&
      data.female_employees > data.total_employees
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Cannot exceed total employees",
        path: ["female_employees"],
      });
    }
  });

// Choice fields in this static schema that pair with an `${key}_other` free
export const OTHER_TEXT_FIELDS = [
  "primary_sector",
  "business_model",
  "stage",
  "revenue_models",
  "funding_stage",
  "nic_name",
] as const;

// Require the companion free text whenever "Other" is selected. Picking "Other"
export function applyOtherRefine(
  data: Record<string, unknown>,
  ctx: z.RefinementCtx,
  fields: readonly string[]
) {
  for (const key of fields) {
    if (!isOtherPicked(data[key])) continue;
    const text = data[`${key}_other`];
    if (typeof text !== "string" || !text.trim()) {
      ctx.addIssue({ code: "custom", message: "Please specify", path: [`${key}_other`] });
    }
  }
}

// City vs country mutual exclusivity, shared between the static submission
export function applyCityCountryRefine(
  data: {
    outside_pakistan?: boolean;
    hq_city?: string;
    hq_other?: string;
    hq_country?: string;
  },
  ctx: z.RefinementCtx
) {
  if (data.outside_pakistan) {
    if (!data.hq_country || !data.hq_country.trim()) {
      ctx.addIssue({ code: "custom", message: "Pick a country", path: ["hq_country"] });
    }
  } else {
    if (!data.hq_city || !data.hq_city.trim()) {
      ctx.addIssue({ code: "custom", message: "Pick a city", path: ["hq_city"] });
    }
    if (isOtherChoice(data.hq_city) && (!data.hq_other || !data.hq_other.trim())) {
      ctx.addIssue({ code: "custom", message: "Enter your city", path: ["hq_other"] });
    }
  }
}

export type SubmissionInput = z.infer<typeof submissionSchema>;

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
    "primary_sector_other",
    "secondary_sector",
    "business_model",
    "business_model_other",
    "stage",
    "stage_other",
    "revenue_models",
    "revenue_models_other",
    "total_employees",
    "female_employees",
    "founding_team_composition",
    "fbr_registered",
    "secp_registered",
    "is_pasha_member",
    "revenue_band",
    "raised_funding",
    "funding_stage",
    "funding_stage_other",
    "currently_raising",
    "pitch_deck_url",
    "pitch_video",
    "incubated_in_nic",
    "nic_name",
    "nic_name_other",
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
