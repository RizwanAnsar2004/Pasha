import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  MapPin,
  Calendar,
  Users,
  TrendingUp,
  Coins,
  Building2,
  Sparkles,
  CheckCircle2,
  PlayCircle,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { earnedBadges } from "@/lib/badges";
import { getFormConfig } from "@/lib/form-config.server";
import { fieldLabelMap } from "@/lib/profile-completion";

// Dynamic-form fields that are SAFE to show on the public profile. Excludes
// investor-only / sensitive answers (market sizing, financials, competitors,
// office address, women-ownership) and all verification documents
// (CNIC, NTN, registration cert, authorization letter, pitch deck).
const PUBLIC_ANSWER_KEYS = [
  "problem_statement",
  "solution_statement",
  "usp",
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
import { KeyPersons, type KeyPerson } from "@/components/KeyPersons";
import { CompanySocials } from "@/components/CompanySocials";
import { createServiceClient } from "@/lib/supabase/server";
import { idPrefixFromSlug, startupSlug } from "@/lib/slug";
import { sanitizeHtml, hasContent, htmlToText } from "@/lib/sanitize-html";
import { RichText as AutoRichText } from "@/components/ui/RichText";
import { safeHref } from "@/lib/safe-url";
import { initials } from "@/lib/utils";
import { DUMMY_STARTUPS } from "@/lib/dummy-startups";

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

function formatDate(s: string | null | undefined): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.valueOf())) return null;
  return d.toLocaleDateString("en-PK", { year: "numeric", month: "long" });
}

function splitMulti(v: string | null | undefined): string[] {
  if (!v) return [];
  return String(v)
    .split(/[|;,]+/)
    .map((s) => s.trim())
    .filter((s) => s && s.toUpperCase() !== "NULL");
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

  // Canonical-slug redirect: if someone reaches this page with a stale name
  // portion, we still render — but Next will canonicalize via metadata.
  const tagline = cleanText(row.tagline);
  const sector = cleanText(row.primary_industry);
  // Prefer city if present, else hq_country (for outside-Pakistan rows).
  const cityRaw = cleanText(row.city);
  const country = cleanText(row.hq_country);
  const city = cityRaw ?? country;
  const nic = cleanText(row.nic_name);
  const founded = formatDate(row.founded_date);
  const websiteHref = row.website ? safeHref(row.website) : "#";
  const websiteShown = row.website
    ? row.website.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : null;

  const ideaHtml = sanitizeHtml(row.startup_idea);
  const modelHtml = sanitizeHtml(row.business_model);
  const impact = cleanText(row.social_impact);

  // Public-safe dynamic fields synced from the application, labelled from the
  // live form config (falls back to a humanised key).
  const formConfig = await getFormConfig();
  const answerLabels = formConfig ? fieldLabelMap(formConfig) : {};
  const answers = (row.answers && typeof row.answers === "object" ? row.answers : {}) as Record<string, unknown>;
  const businessItems = PUBLIC_ANSWER_KEYS.map((key) => {
    const value = answers[key];
    return { key, label: answerLabels[key] ?? key.replace(/_/g, " "), value };
  }).filter(
    (it) =>
      it.value != null &&
      it.value !== "" &&
      !(Array.isArray(it.value) && it.value.length === 0)
  );

  const employees = row.total_employees && row.total_employees > 0 ? row.total_employees : null;
  const female = row.female_employees && row.female_employees > 0 ? row.female_employees : null;
  const revenue = formatPKR(row.current_revenue);
  const customers = row.number_of_customers && row.number_of_customers > 0 ? row.number_of_customers : null;

  const secondaries = splitMulti(row.secondary_industries);
  const bizTypes = splitMulti(row.business_types);
  const sdgs = splitMulti(row.sdgs);

  const logoOk = isSelfHostedImage(row.logo_url);
  const video = isVideoPitchLink(row.video_pitch) ? row.video_pitch : null;

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-white">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 py-10 sm:py-14">
          <Link
            href="/directory"
            className="inline-flex items-center gap-1.5 text-sm text-pasha-muted hover:text-pasha-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden /> Back to directory
          </Link>

          {/* Claim banner — shown for any startup that didn't come through
              the apply form (i.e. our original scrape, or any other import).
              source can be null on very old rows; we treat null as
              "unknown / not claimed" too. */}
          {row.source !== "submission" && (
            <div className="mt-6 rounded-xl border border-pasha-red/30 bg-pasha-red/[0.04] px-4 py-3.5 sm:px-5 sm:py-4 text-sm text-pasha-ink">
              <p className="leading-relaxed">
                <strong className="font-medium">Is this your company?</strong>{" "}
                This profile was imported from a public source. To claim it
                and keep the information current, email{" "}
                <a
                  href={`mailto:support@pasha.org.pk?subject=${encodeURIComponent(
                    `Claim profile: ${row.startup_name}`
                  )}`}
                  className="text-pasha-red font-medium hover:underline"
                >
                  support@pasha.org.pk
                </a>{" "}
                from a company-domain address.
              </p>
            </div>
          )}

          {/* Hero */}
          <header className="mt-6 flex flex-col sm:flex-row items-start gap-5 sm:gap-7">
            <div className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-pasha-line bg-white grid place-items-center overflow-hidden">
              {logoOk ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.logo_url!}
                  alt={`${row.startup_name} logo`}
                  className="w-full h-full object-contain p-2"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <span className="text-2xl font-semibold text-pasha-muted">{initials(row.startup_name)}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {sector && (
                  <span className="inline-flex items-center text-[10px] font-mono uppercase tracking-[1px] px-2 py-1 rounded-md bg-pasha-red/[0.06] text-pasha-red">
                    {sector}
                  </span>
                )}
                {row.secp_verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[1px] px-2 py-1 rounded-md bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" aria-hidden /> SECP verified
                  </span>
                )}
              </div>
              <h1 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl tracking-tight text-pasha-ink text-balance inline-flex items-center flex-wrap gap-x-3 gap-y-1">
                <span>{row.startup_name}</span>
                {row.pasha_verified && (
                  <span className="inline-block translate-y-[2px]">
                    <VerifiedBadge size="lg" />
                  </span>
                )}
              </h1>
              <AutoRichText
                value={tagline}
                className="mt-2 text-base sm:text-lg text-pasha-muted leading-relaxed text-pretty"
              />
              {(() => {
                const badges = earnedBadges({
                  womenLed: row.women_led,
                  hiring: row.hiring,
                  fundraising: row.fundraising,
                }); // verified shown via VerifiedBadge above; featured handled elsewhere
                if (badges.length === 0) return null;
                const cls: Record<string, string> = {
                  pink: "bg-pink-50 text-pink-700 border-pink-100",
                  blue: "bg-sky-50 text-sky-700 border-sky-100",
                  green: "bg-green-50 text-green-700 border-green-100",
                };
                return (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {badges.map((b) => (
                      <span
                        key={b.key}
                        title={b.description}
                        className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium ${cls[b.tone] ?? "bg-pasha-stone text-pasha-muted"}`}
                      >
                        {b.short}
                      </span>
                    ))}
                  </div>
                );
              })()}
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-pasha-muted">
                {city && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" aria-hidden /> {city}
                  </span>
                )}
                {founded && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" aria-hidden /> Founded {founded}
                  </span>
                )}
                {websiteShown && websiteHref !== "#" && (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-pasha-ink hover:text-pasha-red transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" aria-hidden /> {websiteShown}
                  </a>
                )}
                {video && (
                  <a
                    href={safeHref(video)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-pasha-ink hover:text-pasha-red transition-colors"
                  >
                    <PlayCircle className="w-3.5 h-3.5" aria-hidden /> Watch pitch
                  </a>
                )}
                <CompanySocials
                  linkedin={row.company_linkedin}
                  x={row.company_x}
                  instagram={row.company_instagram}
                  facebook={row.company_facebook}
                  youtube={row.company_youtube}
                />
              </div>
            </div>
          </header>

          {/* Stats strip */}
          {(revenue || employees || female || customers) && (
            <section className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px rounded-xl overflow-hidden border border-pasha-line bg-pasha-line">
              {revenue && (
                <Stat icon={<TrendingUp className="w-3.5 h-3.5" aria-hidden />} label="Annual revenue" value={revenue} />
              )}
              {employees && (
                <Stat
                  icon={<Users className="w-3.5 h-3.5" aria-hidden />}
                  label="Team"
                  value={`${employees.toLocaleString("en-PK")} people`}
                />
              )}
              {female && (
                <Stat
                  icon={<Sparkles className="w-3.5 h-3.5" aria-hidden />}
                  label="Female team"
                  value={`${female.toLocaleString("en-PK")} people`}
                />
              )}
              {customers && (
                <Stat
                  icon={<Coins className="w-3.5 h-3.5" aria-hidden />}
                  label="Customers"
                  value={customers.toLocaleString("en-PK")}
                />
              )}
            </section>
          )}

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-14">
            {/* Main column */}
            <div className="min-w-0 space-y-10">
              {hasContent(ideaHtml) && (
                <Section title="About">
                  <RichText html={ideaHtml} />
                </Section>
              )}
              {hasContent(modelHtml) && (
                <Section title="Business model">
                  <RichText html={modelHtml} />
                </Section>
              )}
              {businessItems.length > 0 && (
                <Section title="Business profile">
                  <dl className="space-y-4">
                    {businessItems.map((it) => (
                      <div key={it.key}>
                        <dt className="text-[11px] font-mono uppercase tracking-[1.5px] text-pasha-muted">
                          {it.label}
                        </dt>
                        <dd className="mt-1 text-[15px] text-pasha-ink/85 leading-relaxed">
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
                </Section>
              )}
              <KeyPersons persons={row.key_persons} />
              {cleanText(row.awards) && (
                <Section title="Awards & recognition">
                  <p className="text-[15px] text-pasha-ink/85 leading-relaxed whitespace-pre-line">
                    {cleanText(row.awards)}
                  </p>
                </Section>
              )}
              {cleanText(row.certifications) && (
                <Section title="Certifications">
                  <p className="text-[15px] text-pasha-ink/85 leading-relaxed whitespace-pre-line">
                    {cleanText(row.certifications)}
                  </p>
                </Section>
              )}
              {impact && (
                <Section title="Social impact">
                  <p className="text-[15px] text-pasha-ink/85 leading-relaxed">{impact}</p>
                </Section>
              )}
              {sdgs.length > 0 && (
                <Section title="UN sustainability alignment">
                  <ul className="flex flex-wrap gap-2">
                    {sdgs.map((s) => (
                      <li
                        key={s}
                        className="inline-flex items-center text-xs px-2.5 py-1.5 rounded-md border border-pasha-line bg-pasha-stone/40 text-pasha-ink/80"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              <DetailGroup title="Company">
                <DetailRow label="Legal name" value={cleanText(row.company_name) ?? row.startup_name} />
                <DetailRow label="Founded" value={founded} />
                <DetailRow label="Primary industry" value={sector} />
                {secondaries.length > 0 && (
                  <DetailRow label="Other industries" value={secondaries.join(", ")} />
                )}
                {bizTypes.length > 0 && (
                  <DetailRow label="Business model" value={bizTypes.join(", ")} />
                )}
                <DetailRow label="Product stage" value={cleanText(row.product_stage)} />
                <DetailRow label="HQ" value={city} />
              </DetailGroup>

              {(nic || row.incubation_stage || row.cohort) && (
                <DetailGroup title="Incubation">
                  <DetailRow label="Network" value={nic} icon={<Building2 className="w-3 h-3" aria-hidden />} />
                  <DetailRow label="Stage" value={cleanText(row.incubation_stage)} />
                  <DetailRow label="Cohort" value={cleanText(row.cohort)} />
                  <DetailRow label="Joined" value={formatDate(row.joining_date)} />
                </DetailGroup>
              )}

              {(revenue || row.investment_raised || row.investment_commitment) && (
                <DetailGroup title="Traction">
                  <DetailRow label="Revenue" value={revenue} />
                  <DetailRow label="Customers" value={customers ? customers.toLocaleString("en-PK") : null} />
                  <DetailRow
                    label="Investment raised"
                    value={
                      row.investment_raised && row.investment_raised > 1
                        ? formatPKR(row.investment_raised)
                        : row.investment_raised === 1
                          ? "Disclosed"
                          : null
                    }
                  />
                  <DetailRow
                    label="Commitments"
                    value={(() => {
                      const n = Number(row.investment_commitment);
                      return Number.isFinite(n) && n > 0 ? formatPKR(n) : null;
                    })()}
                  />
                  <DetailRow label="Source of capital" value={cleanText(row.investment_raised_from)} />
                </DetailGroup>
              )}
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

// === presentational helpers ===
function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-4">
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[1.5px] text-pasha-muted">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 text-base sm:text-lg font-medium text-pasha-ink tabular-nums">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-red">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function RichText({ html }: { html: string }) {
  return (
    <div
      className="max-w-none text-[15px] text-pasha-ink/90 leading-relaxed [&_a]:text-pasha-red [&_a]:underline [&_a:hover]:text-pasha-red/80 [&_p]:my-2.5 [&_p:first-child]:mt-0 [&_ul]:my-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_strong]:font-semibold [&_strong]:text-pasha-ink [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold"
      // Sanitized server-side via sanitizeHtml allowlist.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-pasha-line bg-white p-5">
      <h3 className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-muted">{title}</h3>
      <dl className="mt-3 space-y-2.5">{children}</dl>
    </div>
  );
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
}) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2 items-start text-xs">
      <dt className="text-pasha-muted">{label}</dt>
      <dd className="text-pasha-ink/90 inline-flex items-center gap-1.5 break-words">
        {icon}
        <span>{value}</span>
      </dd>
    </div>
  );
}
