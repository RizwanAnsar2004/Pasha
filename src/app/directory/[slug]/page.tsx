import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  Calendar,
  Briefcase,
  Globe,
  CheckCircle2,
  PlayCircle,
  AlertCircle,
  Lightbulb,
  ArrowUpRight,
  ShieldCheck,
  Users,
  Info,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ShareProfileButton } from "@/components/ShareProfileButton";
import { earnedBadges } from "@/lib/badges";
import { getFormConfig } from "@/lib/form-config.server";
import { getAwardEntriesForDatabank, type AwardEntry } from "@/lib/awards.server";
import { parseAwardsText } from "@/lib/awards-sync.server";
import { fieldLabelMap } from "@/lib/profile-completion";
import { Kicker } from "@/components/landing/shared/Kicker";
import { PillButton } from "@/components/landing/shared/PillButton";
import { Reveal } from "@/components/landing/shared/Reveal";

// Dynamic-form fields that are SAFE to show on the public profile. Excludes
// investor-only / sensitive answers (market notes, financials, competitors,
// office address, women-ownership) and all verification documents (CNIC,
// NTN, registration cert, authorization letter, pitch deck).
// TAM / SAM / SOM are all public — see the Market Opportunity section below.
const PUBLIC_ANSWER_KEYS = [
  "problem_statement",
  "solution_statement",
  "usp",
  "tam_amount",
  "product_features",
  "product_maturity",
  "target_customers",
  "gtm_channels",
  "operating_markets",
  "demo_video_url",
  "app_store_url",
  "play_store_url",
] as const;
const ANSWER_URL_KEYS = new Set(["demo_video_url", "app_store_url", "play_store_url"]);
// Problem / solution / TAM / SAM / SOM get dedicated hero-story treatment
// further down the page, so they're excluded from the generic "Business
// profile" list to avoid showing the same answer twice.
const DEDICATED_ANSWER_KEYS = new Set([
  "problem_statement",
  "solution_statement",
  "tam_amount",
  "sam_amount",
  "som_amount",
]);
const PUBLIC_ANSWER_LABEL_OVERRIDES: Record<string, string> = {
  tam_amount: "Total Addressable Market (TAM)",
  sam_amount: "Serviceable Available Market (SAM)",
  som_amount: "Serviceable Obtainable Market (SOM)",
};
import type { KeyPerson } from "@/components/KeyPersons";
import { createServiceClient } from "@/lib/supabase/server";
import { idPrefixFromSlug, startupSlug } from "@/lib/slug";
import { sanitizeHtml, hasContent, htmlToText } from "@/lib/sanitize-html";
import { RichText as AutoRichText } from "@/components/ui/RichText";
import { safeHref, safeImageSrc } from "@/lib/safe-url";
import { cn, initials } from "@/lib/utils";
import { DUMMY_STARTUPS } from "@/lib/dummy-startups";
import { FUNDING_AMOUNT_RANGES } from "@/lib/options";

// value→label maps for the form's range bands. New records store revenue /
// funding as select bands (not numeric columns), so the profile falls back to
// the readable range when the numeric column is empty.
const RAISED_BAND_LABEL: Record<string, string> = Object.fromEntries(
  FUNDING_AMOUNT_RANGES.map((o) => [o.value, o.label])
);
function bandLabel(code: unknown, map: Record<string, string>): string | null {
  if (typeof code !== "string" || !code || code === "na") return null;
  const label = map[code];
  if (!label) return null;
  return label.replace(/\s*\/\s*(year|month)$/i, "").trim();
}

export const dynamic = "force-dynamic";
// Detail pages are ISR — first hit generates, then cached.
export const dynamicParams = true;

type Row = {
  id: string;
  // Origin signal — "submission" means this came through the apply form
  // (the founder has already claimed the profile). Anything else (e.g.
  // "startupconnect") means we scraped or imported it, and the founder
  // hasn't claimed it yet — we show them a "claim this profile" banner.
  source: string | null;
  startup_name: string;
  company_name: string | null;
  tagline: string | null;
  website: string | null;
  founded_date: string | null;
  primary_industry: string | null;
  secondary_industries: string | null;
  business_types: string | null;
  product_stage: string | null;
  sdgs: string | null;
  city: string | null;
  nic_name: string | null;
  incubation_stage: string | null;
  cohort: string | null;
  joining_date: string | null;
  total_employees: number | null;
  female_employees: number | null;
  jobs_created: number | null;
  current_revenue: number | null;
  investment_raised: number | null;
  investment_commitment: string | null;
  investment_raised_from: string | null;
  number_of_customers: number | null;
  video_pitch: string | null;
  logo_url: string | null;
  startup_idea: string | null;
  business_model: string | null;
  social_impact: string | null;
  secp_verified: boolean | null;
  pasha_verified: boolean | null;
  women_led?: boolean | null;
  hiring?: boolean | null;
  fundraising?: boolean | null;
  answers?: Record<string, unknown> | null;
  // v2 additions — present only after the 20260521 migration runs. The
  // defensive select falls back to the legacy column list when these are
  // missing, so the page renders fine on pre-migration prod data.
  key_persons: KeyPerson[] | null;
  company_linkedin: string | null;
  company_x: string | null;
  company_instagram: string | null;
  company_facebook: string | null;
  company_youtube: string | null;
  hq_country: string | null;
  awards: string | null;
  certifications: string | null;
};

async function getStartup(slug: string): Promise<Row | null> {
  const prefix = idPrefixFromSlug(slug);
  if (!prefix) return null;
  // UUIDs are lexicographically sortable in PG. Prefix match is a range query:
  // id ∈ [prefix-0000-…, nextPrefix-0000-…). The `.like("id", "X%")` form
  // would error since UUID has no LIKE operator without an explicit cast.
  const lower = `${prefix}-0000-0000-0000-000000000000`;
  const upperPrefix = nextHex(prefix);
  if (!upperPrefix) return null;
  const upper = `${upperPrefix}-0000-0000-0000-000000000000`;
  const supabase = createServiceClient();
  // Defensive select chain: try the full (post-v2-migration) column list, then
  // fall back step-by-step. Once the v2 migration runs in prod, the FULL path
  // always succeeds; the fallbacks exist for the brief in-between deploy state.
  const V2_ADDITIONS =
    "key_persons, company_linkedin, company_x, company_instagram, company_facebook, company_youtube, hq_country, awards, certifications, women_led, hiring, fundraising, answers";
  const LEGACY_NO_PASHA =
    "id, source, startup_name, company_name, tagline, website, founded_date, primary_industry, secondary_industries, business_types, product_stage, sdgs, city, nic_name, incubation_stage, cohort, joining_date, total_employees, female_employees, jobs_created, current_revenue, investment_raised, investment_commitment, investment_raised_from, number_of_customers, video_pitch, logo_url, startup_idea, business_model, social_impact, secp_verified";
  const LEGACY = `${LEGACY_NO_PASHA}, pasha_verified`;
  const FULL = `${LEGACY}, ${V2_ADDITIONS}`;

  async function tryFetch(columns: string) {
    return supabase
      .from("databank")
      .select(columns)
      .gte("id", lower)
      .lt("id", upper)
      .limit(1)
      .maybeSingle();
  }

  let { data, error } = await tryFetch(FULL);
  if (error && /key_persons|company_|hq_country|awards|certifications|women_led|hiring|fundraising|answers/.test(error.message ?? "")) {
    ({ data, error } = await tryFetch(LEGACY));
  }
  if (error && /pasha_verified/.test(error.message ?? "")) {
    ({ data, error } = await tryFetch(LEGACY_NO_PASHA));
  }
  if (error || !data) {
    // Fall back to dummy seed data when no real DB is connected.
    const dummy = DUMMY_STARTUPS.find((s) => {
      const tail = s.id.replace(/-/g, "").slice(0, 8).toLowerCase();
      return tail === prefix;
    });
    if (!dummy) return null;
    return {
      id: dummy.id,
      source: "submission",
      startup_name: dummy.startup_name,
      company_name: null,
      tagline: dummy.tagline,
      website: dummy.website,
      founded_date: null,
      primary_industry: dummy.primary_industry,
      secondary_industries: null,
      business_types: null,
      product_stage: null,
      sdgs: null,
      city: dummy.city,
      nic_name: dummy.nic_name,
      incubation_stage: null,
      cohort: null,
      joining_date: null,
      total_employees: dummy.total_employees,
      female_employees: null,
      jobs_created: null,
      current_revenue: dummy.current_revenue,
      investment_raised: dummy.investment_raised,
      investment_commitment: null,
      investment_raised_from: null,
      number_of_customers: dummy.number_of_customers,
      video_pitch: null,
      logo_url: dummy.logo_url,
      startup_idea: dummy.tagline,
      business_model: null,
      social_impact: null,
      secp_verified: null,
      pasha_verified: dummy.pasha_verified,
      key_persons: [{ name: dummy.founder_name, role: dummy.founder_role, photo_url: dummy.founder_photo_url }],
      company_linkedin: null,
      company_x: null,
      company_instagram: null,
      company_facebook: null,
      company_youtube: null,
      hq_country: "Pakistan",
      awards: null,
      certifications: null,
    } as Row;
  }
  return data as unknown as Row;
}

/** Increment an 8-char hex string by one. Returns null if it overflows. */
function nextHex(hex: string): string | null {
  const n = parseInt(hex, 16);
  if (!Number.isFinite(n)) return null;
  if (n >= 0xffffffff) return null;
  return (n + 1).toString(16).padStart(8, "0");
}

type RelatedStartup = {
  id: string;
  startup_name: string;
  tagline: string | null;
  primary_industry: string | null;
  city: string | null;
  logo_url: string | null;
  product_stage: string | null;
  founded_date: string | null;
  website: string | null;
  company_linkedin: string | null;
  pasha_verified: boolean | null;
  total_employees: number | null;
  business_types: string | null;
  women_led: boolean | null;
  hiring: boolean | null;
  fundraising: boolean | null;
};

const RELATED_COLS =
  "id,startup_name,tagline,primary_industry,city,logo_url,product_stage,founded_date,website,company_linkedin,pasha_verified,created_at,total_employees,business_types,women_led,hiring,fundraising";

/**
 * Other startups a visitor browsing this profile might want to see next —
 * same sector first, topped up with the most recently added listings if the
 * sector doesn't have enough. Real rows only, same top-up pattern used for
 * the homepage watchlist (never fabricated).
 */
async function getRelatedStartups(currentId: string, sector: string | null, limit = 3): Promise<RelatedStartup[]> {
  const supabase = createServiceClient();
  const picked: RelatedStartup[] = [];

  try {
    if (sector) {
      const { data } = await supabase
        .from("databank")
        .select(RELATED_COLS)
        .neq("id", currentId)
        .ilike("primary_industry", sector)
        .order("pasha_verified", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(limit);
      picked.push(...((data ?? []) as unknown as RelatedStartup[]));
    }

    if (picked.length < limit) {
      const excludeIds = [currentId, ...picked.map((p) => p.id)];
      const { data } = await supabase
        .from("databank")
        .select(RELATED_COLS)
        .not("id", "in", `(${excludeIds.join(",")})`)
        .order("created_at", { ascending: false })
        .limit(limit - picked.length);
      picked.push(...((data ?? []) as unknown as RelatedStartup[]));
    }
  } catch {
    return picked.slice(0, limit);
  }

  return picked.slice(0, limit);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const row = await getStartup(slug);
  if (!row) {
    return { title: "Startup not found" };
  }
  const cleanTagline = htmlToText(row.tagline) || null;
  const fallback = `${row.primary_industry ?? "Pakistan startup"}${row.city ? ` based in ${row.city}` : ""}.`;
  const description = cleanTagline ?? fallback;
  // The root layout already appends "· P@SHA Startup Community" via its
  // title template, so we only need the startup-level prefix here.
  return {
    title: row.startup_name,
    description,
    alternates: { canonical: `/directory/${startupSlug(row.startup_name, row.id)}` },
    openGraph: {
      title: `${row.startup_name} · P@SHA Startup Directory`,
      description,
      url: `/directory/${startupSlug(row.startup_name, row.id)}`,
      images: row.logo_url ? [{ url: row.logo_url }] : undefined,
    },
  };
}

// === formatters ===
function cleanText(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s.toUpperCase() === "NULL" || s === "—") return null;
  return s;
}

function formatPKR(n: number | null | undefined): string | null {
  if (!n || n <= 0) return null;
  if (n >= 1_00_00_00_000) return `Rs ${(n / 1_00_00_00_000).toFixed(1)} bn`;
  if (n >= 10_000_000) return `Rs ${(n / 10_000_000).toFixed(1)} cr`;
  if (n >= 100_000) return `Rs ${(n / 100_000).toFixed(1)} lac`;
  return `Rs ${n.toLocaleString("en-PK")}`;
}

function formatUSDCompact(n: number | null | undefined): string | null {
  if (!n || n <= 0) return null;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US")}`;
}

function formatDate(s: string | null | undefined): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.valueOf())) return null;
  return d.toLocaleDateString("en-PK", { year: "numeric", month: "long" });
}

function formatYear(s: string | null | undefined): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.valueOf())) return null;
  return String(d.getFullYear());
}

function splitMulti(v: string | null | undefined): string[] {
  if (!v) return [];
  return String(v)
    .split(/[|;,]+/)
    .map((s) => s.trim())
    .filter((s) => s && s.toUpperCase() !== "NULL");
}

// Compact number formatter for the related-card facts grid (1,200,000 → "1.2M").
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toLocaleString("en-PK");
}

function isSelfHostedImage(u: string | null | undefined): u is string {
  if (!u) return false;
  try {
    const url = new URL(u);
    return url.host.endsWith("supabase.co");
  } catch {
    return false;
  }
}

function isVideoPitchLink(u: string | null | undefined): u is string {
  if (!u) return false;
  try {
    const url = new URL(u);
    return ["youtube.com", "www.youtube.com", "youtu.be", "vimeo.com", "drive.google.com"].includes(url.host);
  } catch {
    return false;
  }
}

// === page ===
export default async function StartupDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const row = await getStartup(slug);
  if (!row) notFound();

  // Awards are curated in Admin → Award Winners (startup_awards) — structured
  // with year + description. Prefer those; fall back to parsing the legacy
  // databank.awards free-text blob when none are curated.
  const curatedAwards = await getAwardEntriesForDatabank(row.id);
  const awardEntries: AwardEntry[] =
    curatedAwards.length > 0
      ? curatedAwards
      : parseAwardsText(cleanText(row.awards)).map((a) => ({ title: a.title, year: a.year, description: null }));

  const tagline = cleanText(row.tagline);
  const sector = cleanText(row.primary_industry);
  const cityRaw = cleanText(row.city);
  const country = cleanText(row.hq_country);
  const city = cityRaw ?? country;
  const stage = cleanText(row.product_stage);
  const founded = formatDate(row.founded_date);
  const teamSizeDisplay =
    row.total_employees && row.total_employees > 0 ? `${row.total_employees.toLocaleString()} people` : null;
  const websiteHref = row.website ? safeHref(row.website) : "#";
  const websiteShown = row.website
    ? row.website.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : null;

  const ideaHtml = sanitizeHtml(row.startup_idea);
  const modelHtml = sanitizeHtml(row.business_model);
  const impact = cleanText(row.social_impact);

  const formConfig = await getFormConfig();
  const answerLabels = formConfig ? fieldLabelMap(formConfig) : {};
  const answers = (row.answers && typeof row.answers === "object" ? row.answers : {}) as Record<string, unknown>;
  const businessItems = PUBLIC_ANSWER_KEYS.filter((k) => !DEDICATED_ANSWER_KEYS.has(k))
    .map((key) => {
      const value = answers[key];
      return { key, label: PUBLIC_ANSWER_LABEL_OVERRIDES[key] ?? answerLabels[key] ?? key.replace(/_/g, " "), value };
    })
    .filter(
      (it) =>
        it.value != null &&
        it.value !== "" &&
        !(Array.isArray(it.value) && it.value.length === 0)
    );

  // Dedicated Problem / Solution / Market Opportunity fields — pulled straight
  // from the answers bag rather than the generic list above so they can get
  // their own story-section treatment further down the page.
  const problemText = typeof answers.problem_statement === "string" ? answers.problem_statement.trim() : "";
  const solutionText = typeof answers.solution_statement === "string" ? answers.solution_statement.trim() : "";
  const tamRaw = answers.tam_amount;
  const tamNum = typeof tamRaw === "number" ? tamRaw : typeof tamRaw === "string" ? Number(tamRaw) : NaN;
  const tamDisplay = Number.isFinite(tamNum) && tamNum > 0 ? formatUSDCompact(tamNum) : null;
  const samRaw = answers.sam_amount;
  const samNum = typeof samRaw === "number" ? samRaw : typeof samRaw === "string" ? Number(samRaw) : NaN;
  const samDisplay = Number.isFinite(samNum) && samNum > 0 ? formatUSDCompact(samNum) : null;
  const somRaw = answers.som_amount;
  const somNum = typeof somRaw === "number" ? somRaw : typeof somRaw === "string" ? Number(somRaw) : NaN;
  const somDisplay = Number.isFinite(somNum) && somNum > 0 ? formatUSDCompact(somNum) : null;
  // Relative bar width for the market-size visualization — scaled against the
  // largest of the three real values present (never fabricated).
  const marketMax = Math.max(
    Number.isFinite(tamNum) ? tamNum : 0,
    Number.isFinite(samNum) ? samNum : 0,
    Number.isFinite(somNum) ? somNum : 0
  );
  const marketBarPct = (n: number) => (marketMax > 0 ? Math.max(6, Math.round((n / marketMax) * 100)) : 0);
  const marketMetrics = [
    tamDisplay
      ? {
          badge: "TAM",
          value: tamDisplay,
          pct: marketBarPct(tamNum),
          label: "Total addressable market",
          tint: "bg-[#f0d9d6]",
          body: "The complete market demand for this category if the startup reached every potential customer.",
        }
      : null,
    samDisplay
      ? {
          badge: "SAM",
          value: samDisplay,
          pct: marketBarPct(samNum),
          label: "Serviceable available market",
          tint: "bg-[#dff1ea]",
          body: "The portion of the total market aligned with the startup's geography, product and operating model.",
        }
      : null,
    somDisplay
      ? {
          badge: "SOM",
          value: somDisplay,
          pct: marketBarPct(somNum),
          label: "Serviceable obtainable market",
          tint: "bg-[#e9e2f2]",
          body: "The realistic near-term opportunity the startup can capture with its current capabilities and strategy.",
        }
      : null,
  ].filter((m): m is NonNullable<typeof m> => m !== null);

  const customers = row.number_of_customers && row.number_of_customers > 0 ? row.number_of_customers : null;
  const raisedDisplay =
    (row.investment_raised && row.investment_raised > 1
      ? formatPKR(row.investment_raised)
      : row.investment_raised === 1
        ? "Disclosed"
        : null) ?? bandLabel(answers.total_funding_raised, RAISED_BAND_LABEL);

  const secondaries = splitMulti(row.secondary_industries);
  const bizTypes = splitMulti(row.business_types);
  const sdgs = splitMulti(row.sdgs);
  const certifications = splitMulti(row.certifications);

  const logoOk = isSelfHostedImage(row.logo_url);
  const video = isVideoPitchLink(row.video_pitch) ? row.video_pitch : null;
  const badges = earnedBadges({
    womenLed: row.women_led,
    hiring: row.hiring,
    fundraising: row.fundraising,
  });

  const snapshotTiles = [
    { label: "Founded", value: founded },
    { label: "Stage", value: stage },
    { label: "Customers", value: customers ? customers.toLocaleString("en-PK") : (raisedDisplay ? `${raisedDisplay} raised` : null) },
    { label: "Primary market", value: city },
  ].filter((t): t is { label: string; value: string } => !!t.value);

  const related = await getRelatedStartups(row.id, sector);

  // Section numbering is computed up front (not hardcoded) so the "01 / 02 …"
  // labels stay contiguous even when a startup is missing some optional data.
  const hasProblem = problemText.length > 0;
  const hasSolution = solutionText.length > 0;
  const hasMarket = !!tamDisplay || !!samDisplay || !!somDisplay;
  const hasRecognition = awardEntries.length > 0;
  const hasCertifications = certifications.length > 0;
  const hasBusinessExtra = businessItems.length > 0;
  const hasImpact = !!impact || sdgs.length > 0;
  let sectionCounter = 1;
  const numAbout = String(sectionCounter++).padStart(2, "0");
  const numProblem = hasProblem ? String(sectionCounter++).padStart(2, "0") : null;
  const numSolution = hasSolution ? String(sectionCounter++).padStart(2, "0") : null;
  const numMarket = hasMarket ? String(sectionCounter++).padStart(2, "0") : null;
  const numRecognition = hasRecognition ? String(sectionCounter++).padStart(2, "0") : null;
  const numCertifications = hasCertifications ? String(sectionCounter++).padStart(2, "0") : null;
  const numBusinessExtra = hasBusinessExtra ? String(sectionCounter++).padStart(2, "0") : null;
  const numImpact = hasImpact ? String(sectionCounter++).padStart(2, "0") : null;

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-pasha-stone">
        {/* ── HERO ── */}
        <section className="relative overflow-hidden bg-pasha-ink pt-14 pb-16 sm:pt-16 sm:pb-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
          />
          <div aria-hidden className="pointer-events-none absolute -right-52 -top-80 h-[720px] w-[720px] rounded-full bg-pasha-red/[0.28] blur-[80px]" />
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-48 -right-10 select-none font-serif font-black leading-none text-white/[0.025]"
            style={{ fontSize: "clamp(18rem,32vw,34rem)" }}
          >
            @
          </span>

          <div className="relative site-container">
            <nav aria-label="Breadcrumb" className="mb-10 sm:mb-14 flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[1.5px] text-white/45">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span aria-hidden>/</span>
              <Link href="/directory" className="hover:text-white transition-colors">Startups</Link>
              <span aria-hidden>/</span>
              <strong className="text-white font-bold normal-case tracking-normal">{row.startup_name}</strong>
            </nav>

            {row.source !== "submission" && (
              <div className="mb-8 rounded-2xl border border-pasha-red/30 bg-pasha-red/[0.08] px-4 py-3.5 sm:px-5 sm:py-4 text-sm text-white/85">
                <p className="leading-relaxed">
                  <strong className="font-semibold text-white">Is this your company?</strong>{" "}
                  This profile was imported from a public source. To claim it
                  and keep the information current, email{" "}
                  <a
                    href={`mailto:support@pasha.org.pk?subject=${encodeURIComponent(
                      `Claim profile: ${row.startup_name}`
                    )}`}
                    className="text-white font-semibold underline underline-offset-2 hover:text-pasha-red-light"
                  >
                    support@pasha.org.pk
                  </a>{" "}
                  from a company-domain address.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12 lg:gap-16 items-end">
              <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-7 sm:gap-9 items-start">
                <div className="grid h-[110px] w-[110px] sm:h-[150px] sm:w-[150px] shrink-0 place-items-center overflow-hidden rounded-[28px] sm:rounded-[34px] bg-white font-serif text-3xl sm:text-4xl font-extrabold text-pasha-ink shadow-[0_28px_70px_rgba(0,0,0,0.28)]">
                  {logoOk ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.logo_url!}
                      alt={`${row.startup_name} logo`}
                      className="h-full w-full object-cover"
                      loading="eager"
                      decoding="async"
                    />
                  ) : (
                    <span aria-hidden>{initials(row.startup_name)}</span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="mb-5 flex flex-wrap items-center gap-2">
                    {sector && (
                      <span className="inline-flex min-h-[31px] items-center rounded-full border border-white/17 bg-white/[0.06] px-3 text-[11px] font-bold uppercase tracking-[1.5px] text-white/80">
                        {sector}
                      </span>
                    )}
                    {city && (
                      <span className="inline-flex min-h-[31px] items-center gap-1.5 rounded-full border border-white/17 bg-white/[0.06] px-3 text-[11px] font-bold uppercase tracking-[1.5px] text-white/80">
                        <MapPin className="h-3 w-3" aria-hidden />
                        {city}
                      </span>
                    )}
                    {row.secp_verified && (
                      <span className="inline-flex min-h-[31px] items-center gap-1.5 rounded-full border border-white/17 bg-white/[0.06] px-3 text-[11px] font-bold uppercase tracking-[1.5px] text-white/80">
                        <CheckCircle2 className="h-3 w-3" aria-hidden /> SECP Verified
                      </span>
                    )}
                    {badges.map((b) => (
                      <span
                        key={b.key}
                        title={b.description}
                        className="inline-flex min-h-[31px] items-center rounded-full border border-white/17 bg-white/[0.06] px-3 text-[11px] font-bold uppercase tracking-[1.5px] text-white/80"
                      >
                        {b.short}
                      </span>
                    ))}
                    {row.pasha_verified && (
                      <span className="inline-block">
                        <VerifiedBadge size="md" />
                      </span>
                    )}
                  </div>

                  <h1 className="font-serif text-[2rem] leading-[0.96] tracking-tight sm:text-6xl lg:text-[5.5rem] lg:leading-[0.9] font-extrabold text-white text-balance">
                    {row.startup_name}
                  </h1>

                  {tagline && (
                    <AutoRichText
                      value={tagline}
                      className="mt-5 max-w-2xl text-base sm:text-lg text-white/65 leading-relaxed text-pretty"
                    />
                  )}

                  <div className="mt-8 flex flex-wrap gap-2.5">
                    {websiteShown && websiteHref !== "#" ? (
                      <a
                        href={websiteHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 rounded-2xl bg-pasha-red px-5 py-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(233,33,39,0.2)] transition-all hover:-translate-y-0.5 hover:bg-pasha-red-dark"
                      >
                        Visit website
                        <ArrowUpRight className="h-4 w-4" aria-hidden />
                      </a>
                    ) : video ? (
                      <a
                        href={safeHref(video)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 rounded-2xl bg-pasha-red px-5 py-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(233,33,39,0.2)] transition-all hover:-translate-y-0.5 hover:bg-pasha-red-dark"
                      >
                        <PlayCircle className="h-4 w-4" aria-hidden />
                        Watch pitch
                      </a>
                    ) : null}
                    <ShareProfileButton />
                  </div>
                </div>
              </div>

              {snapshotTiles.length > 0 && (
                <aside
                  aria-label="Startup snapshot"
                  className="overflow-hidden rounded-[26px] border border-white/12 bg-white/[0.055] backdrop-blur-xl"
                >
                  <div className="border-b border-white/10 px-5 py-4 text-[11px] font-bold uppercase tracking-[1.5px] text-white/45">
                    At a glance
                  </div>
                  <div className="grid grid-cols-2">
                    {snapshotTiles.map((t, i) => (
                      <div
                        key={t.label}
                        className={`min-h-[100px] border-b border-white/[0.09] p-5 ${i % 2 === 0 ? "border-r border-white/[0.09]" : ""}`}
                      >
                        <small className="block text-[10px] font-medium uppercase tracking-[1.5px] text-white/40">{t.label}</small>
                        <strong className="text-base leading-tight text-white">{t.value}</strong>
                      </div>
                    ))}
                  </div>
                  {row.pasha_verified && (
                    <div className="flex items-center justify-between px-5 py-4 text-xs text-white/60">
                      <span>Verified profile</span>
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-[#31B57B] text-white">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </div>
                  )}
                </aside>
              )}
            </div>
          </div>
        </section>

        {/* ── CONTENT ── */}
        <section className="py-16 sm:py-24">
          <div className="site-container">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-14 lg:gap-16 items-start">
              {/* ── Main story column ── */}
              <article className="min-w-0">
                <StorySection number={numAbout} label="About">
                  {tagline ? (
                    <AutoRichText
                      value={tagline}
                      className="text-[clamp(1.45rem,2vw,2.1rem)] leading-[1.28] tracking-tight text-pasha-ink max-w-3xl [&_p]:my-0"
                    />
                  ) : (
                    <p className="text-[clamp(1.45rem,2vw,2.1rem)] leading-[1.28] tracking-tight text-pasha-ink max-w-3xl">
                      {`${row.startup_name} is a ${sector ?? "Pakistan-built"} company${city ? ` based in ${city}` : ""}.`}
                    </p>
                  )}
                  {hasContent(ideaHtml) && (
                    <div className="mt-5 max-w-2xl text-[15px] leading-[1.8] text-pasha-ink/65 [&_a]:text-pasha-red [&_a]:underline [&_p]:my-3 [&_p:first-child]:mt-0 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:font-semibold [&_strong]:text-pasha-ink">
                      <RichText html={ideaHtml} />
                    </div>
                  )}
                  {hasContent(modelHtml) && (
                    <div className="mt-5 max-w-2xl">
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-[2px] text-pasha-muted mb-2">
                        Business model
                      </span>
                      <div className="text-[15px] leading-[1.8] text-pasha-ink/65 [&_a]:text-pasha-red [&_a]:underline [&_p]:my-3 [&_p:first-child]:mt-0 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:font-semibold [&_strong]:text-pasha-ink">
                        <RichText html={modelHtml} />
                      </div>
                    </div>
                  )}
                  {(sector || secondaries.length > 0 || bizTypes.length > 0) && (
                    <div className="mt-7 flex flex-wrap gap-2">
                      {Array.from(new Set([sector, ...secondaries, ...bizTypes].filter(Boolean))).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-pasha-ink/10 bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-[1px] text-pasha-ink/65"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </StorySection>

                {(hasProblem || hasSolution) && (
                  <Reveal className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-16 sm:mb-20">
                    {hasProblem && (
                      <ProblemSolutionCard
                        number={numProblem!}
                        label="Problem"
                        body={problemText}
                        icon={<AlertCircle className="h-5 w-5" aria-hidden />}
                        tint="bg-accent-coral/[0.16]"
                        iconColor="text-[#b13f43]"
                      />
                    )}
                    {hasSolution && (
                      <ProblemSolutionCard
                        number={numSolution!}
                        label="Solution"
                        body={solutionText}
                        icon={<Lightbulb className="h-5 w-5" aria-hidden />}
                        tint="bg-accent-green/[0.14]"
                        iconColor="text-[#237e58]"
                      />
                    )}
                  </Reveal>
                )}

                {hasMarket && (
                  <Reveal className="relative overflow-hidden rounded-[29px] bg-pasha-ink p-7 sm:p-9 mb-16 sm:mb-20">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-9 -top-28 select-none font-serif font-black leading-none text-white/[0.025]"
                      style={{ fontSize: "20rem" }}
                    >
                      @
                    </span>
                    <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                      <div className="flex items-start gap-4">
                        <span className="font-serif text-4xl font-extrabold tracking-tight text-white/20">{numMarket}</span>
                        <div>
                          <small className="block text-[11px] font-bold uppercase tracking-[1.5px] text-pasha-red-light">
                            Market opportunity
                          </small>
                          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">TAM, SAM &amp; SOM</h2>
                        </div>
                      </div>
                      <p className="relative max-w-sm text-sm leading-relaxed text-white/55">
                        Market sizing for this category, as reported by the founding team.
                      </p>
                    </div>
                    <div
                      className={cn(
                        "relative grid gap-3",
                        marketMetrics.length === 3
                          ? "sm:grid-cols-3"
                          : marketMetrics.length === 2
                            ? "sm:grid-cols-2"
                            : "sm:grid-cols-1 max-w-md"
                      )}
                    >
                      {marketMetrics.map((m, i) => (
                        <div key={m.badge} className={cn("rounded-[21px] p-6 sm:p-7", m.tint)}>
                          <div className="flex items-center justify-between mb-8">
                            <span className="inline-flex min-h-[27px] items-center rounded-full bg-white/70 px-3 text-[10px] font-extrabold tracking-[1.5px] text-pasha-ink">
                              {m.badge}
                            </span>
                            <span className="text-[10px] font-bold tracking-[1.5px] text-pasha-ink/40">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                          </div>
                          <strong className="block font-serif text-4xl sm:text-5xl font-extrabold tracking-tight text-pasha-ink">
                            {m.value}
                          </strong>
                          <h3 className="mt-3 text-base font-semibold tracking-tight text-pasha-ink">{m.label}</h3>
                          <p className="mt-2 text-xs leading-relaxed text-pasha-ink/60">{m.body}</p>
                          <div className="mt-6 h-1 rounded-full bg-pasha-ink/10">
                            <div
                              className="h-full rounded-full bg-pasha-ink"
                              style={{ width: `${m.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="relative mt-6 flex items-center gap-3 rounded-[16px] bg-white/[0.04] px-5 py-4">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-white/60">
                        <Info className="h-3.5 w-3.5" />
                      </span>
                      <p className="text-[12px] text-white/75">
                        Figures are reported by the founding team and have not been independently verified.
                      </p>
                    </div>
                  </Reveal>
                )}

                {hasRecognition && (
                  <StorySection number={numRecognition!} label="Awards & recognition">
                    <ol className="border-t border-pasha-ink/10">
                      {awardEntries.map((a, i) => (
                        <li
                          key={`${a.title}-${i}`}
                          className="group flex items-start gap-6 border-b border-pasha-ink/10 py-6 transition-transform duration-300 hover:translate-x-1.5"
                        >
                          <span className="w-12 shrink-0 pt-1 text-sm font-bold text-pasha-ink/40">
                            {a.year ?? ""}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-xl font-bold tracking-tight text-pasha-ink">{a.title}</h3>
                            {a.description && (
                              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-pasha-ink/65">{a.description}</p>
                            )}
                          </div>
                          <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-pasha-ink/15 text-pasha-ink/50 transition-all group-hover:bg-pasha-red group-hover:border-pasha-red group-hover:text-white">
                            <ArrowUpRight className="h-4 w-4" aria-hidden />
                          </span>
                        </li>
                      ))}
                    </ol>
                  </StorySection>
                )}

                {hasCertifications && (
                  <StorySection number={numCertifications!} label="Certifications">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {certifications.map((cert) => (
                        <div key={cert} className="flex min-h-[108px] items-center gap-4 rounded-[20px] border border-pasha-ink/10 bg-white p-4.5">
                          <div className="grid h-[58px] w-[58px] shrink-0 place-items-center rounded-2xl bg-pasha-ink">
                            <ShieldCheck className="h-6 w-6 text-white" aria-hidden />
                          </div>
                          <strong className="text-sm font-bold text-pasha-ink">{cert}</strong>
                        </div>
                      ))}
                    </div>
                  </StorySection>
                )}

                {hasBusinessExtra && (
                  <StorySection number={numBusinessExtra!} label="Business profile">
                    <dl className="divide-y divide-pasha-ink/[0.08]">
                      {businessItems.map((it) => (
                        <div key={it.key} className="py-4 first:pt-0">
                          <dt className="text-[10px] font-mono uppercase tracking-[2px] text-pasha-muted mb-1.5">{it.label}</dt>
                          <dd className="text-[15px] text-pasha-ink/80 leading-relaxed">
                            {ANSWER_URL_KEYS.has(it.key) && typeof it.value === "string" ? (
                              <a
                                href={safeHref(it.value)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-pasha-red hover:underline break-all"
                              >
                                {it.value.replace(/^https?:\/\//, "")}
                              </a>
                            ) : Array.isArray(it.value) ? (
                              it.value.join(", ")
                            ) : (
                              <span className="whitespace-pre-line">{String(it.value)}</span>
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </StorySection>
                )}

                {hasImpact && (
                  <StorySection number={numImpact!} label="Impact">
                    {impact && <p className="text-[15px] leading-relaxed text-pasha-ink/70 max-w-2xl">{impact}</p>}
                    {sdgs.length > 0 && (
                      <ul className={`flex flex-wrap gap-2 ${impact ? "mt-5" : ""}`}>
                        {sdgs.map((s) => (
                          <li
                            key={s}
                            className="rounded-full border border-pasha-line bg-white px-3 py-1.5 text-xs text-pasha-ink/70"
                          >
                            {s}
                          </li>
                        ))}
                      </ul>
                    )}
                  </StorySection>
                )}
              </article>

              {/* ── Sidebar ── */}
              <aside className="flex flex-col gap-6 lg:sticky lg:top-[112px]">
                <Reveal className="rounded-[29px] border border-pasha-ink/10 bg-white p-4.5 shadow-[0_18px_50px_rgba(23,23,23,0.055)]">
                  <div className="flex items-end justify-between px-1 pb-3.5 border-b border-pasha-ink/[0.09] mb-0.5">
                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-[1.5px] text-pasha-muted mb-1.5">
                        Company details
                      </span>
                      <h2 className="text-2xl font-bold tracking-tight text-pasha-ink">At a glance</h2>
                    </div>
                    <span className="text-xs font-bold tracking-[1.5px] text-pasha-ink/35">01</span>
                  </div>

                  <div className="overflow-hidden rounded-[21px] mt-3">
                    <div
                      className="relative grid grid-cols-[74px_minmax(0,1fr)_28px] items-center gap-4 p-5"
                      style={{ background: "radial-gradient(circle at 100% 0, rgba(233,33,39,.17), transparent 35%), linear-gradient(140deg,#211f1d,#171717)" }}
                    >
                      <div className="grid h-[74px] w-[74px] place-items-center overflow-hidden rounded-[20px] bg-white font-serif text-lg font-bold text-pasha-ink">
                        {logoOk ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.logo_url!} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                        ) : (
                          <span aria-hidden>{initials(row.startup_name)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <small className="block text-[10px] font-bold uppercase tracking-[1.5px] text-white/45 mb-1.5">
                          {row.pasha_verified ? "Verified startup" : "Directory listing"}
                        </small>
                        <h3 className="truncate text-xl font-bold tracking-tight text-white mb-1.5">{row.startup_name}</h3>
                        {sector && <span className="text-[13px] text-white/60">{sector}</span>}
                      </div>
                      {row.pasha_verified && (
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#31B57B] text-white text-xs font-extrabold">
                          <CheckCircle2 className="h-4 w-4" aria-hidden />
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-px bg-pasha-ink/[0.05]">
                      {[
                        { icon: <Calendar className="h-[19px] w-[19px]" aria-hidden />, label: "Founded", value: founded },
                        { icon: <MapPin className="h-[19px] w-[19px]" aria-hidden />, label: "Location", value: city },
                        { icon: <Users className="h-[19px] w-[19px]" aria-hidden />, label: "Team size", value: teamSizeDisplay },
                        { icon: <Briefcase className="h-[19px] w-[19px]" aria-hidden />, label: "Category", value: sector },
                      ]
                        .filter((f) => f.value)
                        .map((f) => (
                          <div key={f.label} className="min-h-[118px] bg-white py-4 px-2 flex items-start gap-3">
                            <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] bg-pasha-stone text-pasha-muted">
                              {f.icon}
                            </span>
                            <div>
                              <small className="block text-[10px] font-medium uppercase tracking-[1px] text-pasha-muted/80">{f.label}</small>
                              <strong className="text-[12px] leading-snug text-pasha-ink">{f.value}</strong>
                            </div>
                          </div>
                        ))}
                    </div>

                    <SidebarSocialRow row={row} websiteHref={websiteHref} websiteShown={websiteShown} />
                  </div>
                </Reveal>

                {row.key_persons && row.key_persons.length > 0 && (
                  <Reveal delay={0.05} className="rounded-[29px] border border-pasha-ink/10 bg-white p-4.5 shadow-[0_18px_50px_rgba(23,23,23,0.055)]">
                    <div className="flex items-end justify-between px-1 pb-3.5 border-b border-pasha-ink/[0.09] mb-3">
                      <div>
                        <span className="block text-[11px] font-bold uppercase tracking-[1.5px] text-pasha-muted mb-1.5">Leadership</span>
                        <h2 className="text-2xl font-bold tracking-tight text-pasha-ink">Meet the founders</h2>
                      </div>
                      <span className="text-xs font-bold tracking-[1.5px] text-pasha-ink/35">02</span>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {row.key_persons.map((p, i) => {
                        const name = (p.name ?? "").trim();
                        if (!name) return null;
                        const linkedin = p.linkedin ? safeHref(p.linkedin) : null;
                        return (
                          <article key={`${name}-${i}`} className="grid grid-cols-[92px_1fr] overflow-hidden rounded-[22px] border border-pasha-ink/10 bg-white shadow-[0_14px_34px_rgba(23,23,23,0.04)]">
                            <div className="grid h-full min-h-[138px] place-items-center overflow-hidden bg-[#ece8e2]">
                              {p.photo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.photo_url} alt={`${name} photo`} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                              ) : (
                                <span className="font-serif text-lg font-bold text-pasha-muted">{initials(name)}</span>
                              )}
                            </div>
                            <div className="flex flex-col justify-between gap-3 px-4 py-4">
                              <div>
                                <h3 className="text-[15px] font-bold leading-tight tracking-tight text-pasha-ink mb-1.5">{name}</h3>
                                {p.role && <p className="text-xs leading-snug text-pasha-muted">{p.role}</p>}
                              </div>
                              {linkedin && linkedin !== "#" && (
                                <a
                                  href={linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="grid grid-cols-[22px_1fr_auto] items-center gap-2 border-t border-pasha-ink/[0.09] pt-2.5 text-pasha-ink"
                                >
                                  <LinkedInGlyph className="h-[22px] w-[22px] text-[#0A66C2]" />
                                  <strong className="text-[11px] font-bold">LinkedIn</strong>
                                  <ArrowUpRight className="h-3.5 w-3.5 text-pasha-red" aria-hidden />
                                </a>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </Reveal>
                )}

                {(row.investment_commitment || row.investment_raised_from) && (
                  <Reveal delay={0.08} className="rounded-[29px] border border-pasha-ink/10 bg-white p-4.5 shadow-[0_18px_50px_rgba(23,23,23,0.055)]">
                    <div className="px-1 pb-3.5 border-b border-pasha-ink/[0.09] mb-1">
                      <span className="block text-[11px] font-bold uppercase tracking-[1.5px] text-pasha-muted mb-1.5">Funding</span>
                      <h2 className="text-2xl font-bold tracking-tight text-pasha-ink">Traction</h2>
                    </div>
                    <dl className="divide-y divide-pasha-ink/[0.08] px-1">
                      <TractionRow
                        label="Commitments"
                        value={(() => {
                          const n = Number(row.investment_commitment);
                          return Number.isFinite(n) && n > 0 ? formatPKR(n) : null;
                        })()}
                      />
                      <TractionRow label="Source of capital" value={cleanText(row.investment_raised_from)} />
                    </dl>
                  </Reveal>
                )}
              </aside>
            </div>
          </div>
        </section>

        {/* ── RELATED STARTUPS ── */}
        {related.length > 0 && (
          <section className="bg-white py-16 sm:py-24">
            <div className="site-container">
              <Reveal className="flex flex-wrap items-end justify-between gap-6 mb-10">
                <div>
                  <Kicker>Keep exploring</Kicker>
                  <h2 className="mt-4 font-serif text-3xl sm:text-5xl font-extrabold tracking-tight text-pasha-ink">
                    Related startups.
                  </h2>
                  <p className="mt-3 max-w-2xl text-base text-pasha-muted leading-relaxed">
                    Companies in adjacent categories, markets and stages that may be relevant to buyers, investors and ecosystem partners.
                  </p>
                </div>
                <PillButton href="/directory" variant="outline" className="shrink-0">
                  View all startups
                </PillButton>
              </Reveal>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {related.map((r, i) => (
                  <RelatedCard
                    key={r.id}
                    startup={r}
                    tint={RELATED_TINTS[i % RELATED_TINTS.length]}
                    sequence={String(i + 1).padStart(2, "0")}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── BOTTOM CTA ── */}
        <section className="bg-pasha-stone py-14 sm:py-20">
          <div className="site-container">
            <Reveal className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-pasha-ink to-[#2e2a27] px-7 py-10 sm:px-12 sm:py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
              <span
                aria-hidden
                className="pointer-events-none absolute -right-4 -top-24 select-none font-serif font-black leading-none text-white/[0.04]"
                style={{ fontSize: "19rem" }}
              >
                @
              </span>
              <div className="relative">
                <Kicker tone="light" className="text-pasha-red-light">
                  Building a startup in Pakistan?
                </Kicker>
                <h2 className="mt-4 max-w-xl font-serif text-2xl sm:text-4xl lg:text-[3.5rem] font-extrabold leading-[0.98] tracking-tight text-white">
                  Create a profile built for discovery.
                </h2>
              </div>
              <PillButton href="/apply" variant="light" dot={false} className="relative shrink-0">
                Start your application
              </PillButton>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

// === presentational helpers ===

const RELATED_TINTS = [
  {
    bg: "bg-accent-coral/[0.18]",
    text: "text-[#a64043]",
    stripe: "bg-gradient-to-r from-accent-coral to-accent-coral",
    badge: "bg-accent-coral/[0.12] text-[#a64043] border-accent-coral/20",
  },
  {
    bg: "bg-accent-green/[0.16]",
    text: "text-[#267c5a]",
    stripe: "bg-gradient-to-r from-accent-green to-accent-green",
    badge: "bg-accent-green/[0.14] text-[#267c5a] border-accent-green/20",
  },
  {
    bg: "bg-accent-purple/[0.16]",
    text: "text-[#654d88]",
    stripe: "bg-gradient-to-r from-accent-purple to-accent-purple",
    badge: "bg-accent-purple/[0.13] text-[#654d88] border-accent-purple/20",
  },
];

// Women-led / Hiring / Fundraising badge pills — same neutral pill style used
// on the directory listing grid cards (DirectoryClient.tsx's DirectoryBadges).
const RELATED_BADGE_CLS = "bg-pasha-ink/[0.05] text-pasha-ink/65 border-pasha-ink/10";
const RELATED_BADGE_LABEL: Record<"women_led" | "hiring" | "fundraising", string> = {
  women_led: "Women-led",
  hiring: "Hiring",
  fundraising: "Fundraising",
};

function RelatedBadges({ startup }: { startup: RelatedStartup }) {
  const keys = (["women_led", "hiring", "fundraising"] as const).filter((k) => startup[k]);
  if (keys.length === 0) return null;
  return (
    <div className="relative z-20 pointer-events-none flex flex-wrap items-center gap-1 mt-2.5">
      {keys.map((k) => (
        <span
          key={k}
          className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-medium ${RELATED_BADGE_CLS}`}
        >
          {RELATED_BADGE_LABEL[k]}
        </span>
      ))}
    </div>
  );
}

// Numbered editorial section — the big "01 / 02 …" label column paired with
// content, matching the reference's story-section rhythm.
function StorySection({
  number,
  label,
  children,
}: {
  number: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal className="grid grid-cols-1 sm:grid-cols-[120px_minmax(0,1fr)] gap-5 sm:gap-9 pb-16 sm:pb-20">
      <div className="flex sm:block items-center gap-3 pt-1">
        <span className="block font-serif text-3xl sm:text-4xl font-extrabold tracking-tight text-pasha-ink/15">{number}</span>
        <small className="block mt-0 sm:mt-3 text-[11px] font-bold uppercase tracking-[1.5px] text-pasha-muted leading-snug">
          {label}
        </small>
      </div>
      <div className="min-w-0">{children}</div>
    </Reveal>
  );
}

function ProblemSolutionCard({
  number,
  label,
  body,
  icon,
  tint,
  iconColor,
}: {
  number: string;
  label: string;
  body: string;
  icon: React.ReactNode;
  tint: string;
  iconColor: string;
}) {
  return (
    <article className={`relative overflow-hidden rounded-[26px] p-7 min-h-[365px] flex flex-col ${tint}`}>
      <span aria-hidden className="pointer-events-none absolute -right-[100px] -bottom-[115px] h-[230px] w-[230px] rounded-full border border-pasha-ink/[0.13]" />
      <div className="relative flex items-center justify-between mb-11">
        <span className="text-xs font-bold tracking-[1.5px] text-pasha-ink/45">{number}</span>
        <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-white ${iconColor}`}>{icon}</span>
      </div>
      <small className="relative block text-base font-bold uppercase tracking-[2px] text-pasha-ink/60 mb-4">{label}</small>
      {/* The founder's real problem / solution statement — the card's hero copy
          (no generic template headline). Sized to stay prominent yet wrap a
          full paragraph gracefully. */}
      <p className="relative text-[13px] leading-[1.45] tracking-tight text-pasha-ink font-regular max-w-[460px] whitespace-pre-line [overflow-wrap:anywhere]">
        {body}
      </p>
    </article>
  );
}

function RelatedCard({
  startup,
  tint,
  sequence,
}: {
  startup: RelatedStartup;
  tint: { bg: string; text: string; stripe: string; badge: string };
  sequence: string;
}) {
  const safeLogo = safeImageSrc(startup.logo_url);
  const logoOk = isSelfHostedImage(startup.logo_url);
  const href = `/directory/${startupSlug(startup.startup_name, startup.id)}`;
  const websiteHref = startup.website ? safeHref(startup.website) : null;
  const linkedinHref = startup.company_linkedin ? safeHref(startup.company_linkedin) : null;
  const founded = formatYear(startup.founded_date);
  const teamSize = startup.total_employees && startup.total_employees > 0 ? compact(startup.total_employees) : null;
  const businessModel = splitMulti(startup.business_types).join(" · ") || null;
  const statItems = (
    [
      startup.product_stage && { label: "Stage", value: startup.product_stage },
      teamSize && { label: "Team size", value: teamSize },
      businessModel && { label: "Business model", value: businessModel },
    ].filter(Boolean) as { label: string; value: string }[]
  ).slice(0, 3);

  return (
    <Reveal className="group relative flex min-h-[300px] flex-col overflow-hidden rounded-[22px] border border-pasha-ink/10 bg-white p-5 transition-shadow duration-300 hover:shadow-[0_26px_58px_rgba(23,23,23,0.09)]">
      {/* Top accent stripe */}
      <span aria-hidden className={cn("absolute inset-x-0 top-0 h-[4px]", tint.stripe)} />
      <span className="absolute top-4 right-5 font-mono text-[11px] font-bold tracking-[1.5px] text-pasha-ink/35">
        {sequence}
      </span>

      <Link
        href={href}
        aria-label={`View ${startup.startup_name} details`}
        className="absolute inset-0 z-10 rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pasha-red/30"
      />

      {/* Head — logo + title + category */}
      <div className="relative z-20 pointer-events-none flex items-start gap-3">
        <div
          className={cn(
            "grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[15px] text-sm font-bold",
            logoOk ? "bg-white" : `${tint.bg} ${tint.text}`
          )}
        >
          {logoOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={safeLogo} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden>{initials(startup.startup_name)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="min-w-0 truncate font-serif text-[1.1rem] font-semibold leading-tight tracking-tight text-pasha-ink">
              {startup.startup_name}
            </h3>
            {startup.pasha_verified && (
              <span className="pointer-events-auto shrink-0">
                <VerifiedBadge size="sm" />
              </span>
            )}
          </div>
          {startup.primary_industry && (
            <span
              className={cn(
                "mt-1.5 inline-flex max-w-full items-center truncate rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[1px]",
                tint.badge
              )}
            >
              {startup.primary_industry}
            </span>
          )}
        </div>
      </div>

      {/* Hairline divider */}
      <div className="relative z-20 mt-3 border-t border-pasha-ink/[0.07]" />

      {/* Meta row */}
      {(startup.city || founded) && (
        <div className="relative z-20 pointer-events-none mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-pasha-ink/50">
          {startup.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin aria-hidden className="h-3 w-3 text-pasha-red" />
              {startup.city}
            </span>
          )}
          {founded && (
            <span className="inline-flex items-center gap-1">
              <Calendar aria-hidden className="h-3 w-3 text-pasha-red" />
              Founded {founded}
            </span>
          )}
        </div>
      )}

      {/* About */}
      <div className="relative z-20 pointer-events-none mt-2.5">
        {startup.tagline ? (
          <AutoRichText value={startup.tagline} className="text-[13px] leading-relaxed text-pasha-ink/60 line-clamp-2" />
        ) : (
          <p className="text-[12px] leading-relaxed text-pasha-ink/40 italic">No description available</p>
        )}
      </div>

      <RelatedBadges startup={startup} />

      {/* Facts row — Stage / Team size / Business model */}
      {statItems.length > 0 && (
        <div
          className={cn(
            "relative z-20 pointer-events-none mt-auto grid divide-x divide-pasha-ink/[0.07] rounded-[12px] bg-pasha-stone/60 py-2.5",
            statItems.length >= 3 ? "grid-cols-3" : statItems.length === 2 ? "grid-cols-2" : "grid-cols-1"
          )}
        >
          {statItems.map((s, si) => (
            <div key={si} className="px-3">
              <small className="block text-[8px] font-medium uppercase tracking-[1px] text-pasha-muted mb-0.5">{s.label}</small>
              <strong className="block truncate text-[10px] text-pasha-ink">{s.value}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Footer icon actions */}
      <div className={cn("relative z-20 flex items-center justify-between gap-2", statItems.length === 0 ? "mt-auto pt-3 border-t border-pasha-ink/10" : "mt-2.5")}>
        <div className="flex items-center gap-2">
          {websiteHref && websiteHref !== "#" ? (
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit ${startup.startup_name} website`}
              title="Website"
              className="relative z-30 grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-pasha-ink/10 bg-white text-pasha-ink transition-colors hover:bg-pasha-red hover:text-white hover:border-pasha-red"
            >
              <Globe className="h-3.5 w-3.5" />
            </a>
          ) : null}
          {linkedinHref && linkedinHref !== "#" ? (
            <a
              href={linkedinHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit ${startup.startup_name} LinkedIn`}
              title="LinkedIn"
              className="relative z-30 grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-pasha-ink/10 bg-white text-pasha-ink transition-colors hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2]"
            >
              <LinkedInGlyph className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
        <Link
          href={href}
          aria-label={`Open ${startup.startup_name} profile`}
          title="Open profile"
          className="relative z-30 grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-pasha-ink text-white transition-colors hover:bg-pasha-red"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Reveal>
  );
}

function TractionRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-3 text-xs">
      <dt className="text-pasha-muted shrink-0">{label}</dt>
      <dd className="text-pasha-ink/80 text-right font-semibold">{value}</dd>
    </div>
  );
}

function RichText({ html }: { html: string }) {
  return (
    <div
      className="max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ---- Inline brand glyphs. lucide 1.x dropped brand icons; keeping these
// inline (same pattern as CompanySocials.tsx / KeyPersons.tsx) so we don't
// pull a second icon dep.

function LinkedInGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M20.45 20.45h-3.55v-5.56c0-1.32-.03-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.65H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.61 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 110-4.13 2.06 2.06 0 010 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function XGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25h6.735l4.713 6.231L18.244 2.25z" />
    </svg>
  );
}

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="18" cy="6" r="1" fill="currentColor" />
    </svg>
  );
}

function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.464.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
    </svg>
  );
}

function YouTubeGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

// SidebarSocialRow — "Connect with the company" icon row at the bottom of the
// At a glance card (website + whichever social links the startup has set).
function SidebarSocialRow({
  row,
  websiteHref,
  websiteShown,
}: {
  row: Row;
  websiteHref: string;
  websiteShown: string | null;
}) {
  const items: { label: string; href: string; glyph: React.ReactNode; primary?: boolean }[] = [];
  if (websiteShown && websiteHref !== "#") {
    items.push({ label: "Website", href: websiteHref, glyph: <Globe className="h-[18px] w-[18px]" aria-hidden />, primary: true });
  }
  function push(label: string, raw: string | null | undefined, glyph: React.ReactNode) {
    if (!raw) return;
    const href = safeHref(raw);
    if (href === "#") return;
    items.push({ label, href, glyph });
  }
  push("LinkedIn", row.company_linkedin, <LinkedInGlyph className="h-[18px] w-[18px]" />);
  push("Instagram", row.company_instagram, <InstagramGlyph className="h-[18px] w-[18px]" />);
  push("X", row.company_x, <XGlyph className="h-[18px] w-[18px]" />);
  push("YouTube", row.company_youtube, <YouTubeGlyph className="h-[18px] w-[18px]" />);
  push("Facebook", row.company_facebook, <FacebookGlyph className="h-[18px] w-[18px]" />);

  if (items.length === 0) return null;

  return (
    <div className="bg-white px-4.5 pb-4 pt-4.5">
      <span className="block px-0.5 mb-3 text-[10px] font-bold uppercase tracking-[1.5px] text-pasha-muted/80">
        Connect with the company
      </span>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {items.map((it) => (
          <a
            key={it.label}
            href={it.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={it.label}
            title={it.label}
            className={`grid h-12 place-items-center rounded-[13px] border transition-colors ${
              it.primary
                ? "bg-pasha-ink text-white border-pasha-ink"
                : "border-pasha-ink/10 bg-pasha-stone text-pasha-ink hover:bg-pasha-ink hover:text-white hover:border-pasha-ink"
            }`}
          >
            {it.glyph}
          </a>
        ))}
      </div>
    </div>
  );
}

