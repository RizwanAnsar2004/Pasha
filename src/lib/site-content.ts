// Admin-editable singleton content blocks (privacy policy / terms, etc.),
// keyed by a stable slug. Storage + admin editor live in the `site_content`
// table; this module holds the slug registry, types, and the built-in fallback
// text used when the DB row is missing or empty (e.g. pre-migration).

export const SITE_CONTENT_SLUGS = ["privacy_policy"] as const;
export type SiteContentSlug = (typeof SITE_CONTENT_SLUGS)[number];

export type SiteContent = {
  slug: string;
  title: string;
  body: string;
  updated_at?: string | null;
};

export const SITE_CONTENT_META: Record<
  SiteContentSlug,
  { label: string; description: string }
> = {
  privacy_policy: {
    label: "Privacy & Terms",
    description:
      "Shown to applicants as the “Privacy & data-usage agreement” before they accept and create an account.",
  },
};

// Fallback rendered when the DB row is missing/empty. Mirrors the original
// hardcoded terms so nothing breaks before the migration/seed runs.
export const DEFAULT_SITE_CONTENT: Record<
  SiteContentSlug,
  { title: string; body: string }
> = {
  privacy_policy: {
    title: "P@SHA Startup Community — Terms",
    body: `<p><em>Draft for review — the binding version will be issued by P@SHA legal counsel.</em></p>
<h3>1. Acceptance of terms</h3>
<p>By creating an account on the P@SHA Startup Community portal you confirm that you have read, understood and agree to be bound by these terms. If you are registering on behalf of a company, you confirm you are authorised to do so.</p>
<h3>2. Account &amp; eligibility</h3>
<p>Accounts are intended for founders, employees, or authorised representatives of a registered or prospective Pakistani technology startup. You agree to provide accurate information and keep your contact details up to date so the committee can reach you.</p>
<h3>3. Use of the platform</h3>
<p>You may use the portal to submit your application, manage your public directory listing, and engage with P@SHA programmes. You agree not to misuse the platform, attempt to access other applicants' data, upload unlawful or infringing content, or interfere with the service.</p>
<h3>4. Data we collect</h3>
<p>We collect the information you provide in your application (company, founders, funding, documents) plus standard technical metadata (IP, device, timestamps). Uploaded documents (pitch deck, CNIC/passport, registration certificates) are stored privately and shared only with the committee.</p>
<h3>5. How we use it</h3>
<p>Your application is used to (a) verify eligibility, (b) compute vetting tiers, (c) display approved listings on the public directory, and (d) inform you of relevant P@SHA events and opportunities. Personally identifying documents are never published.</p>
<h3>6. Public directory</h3>
<p>Once approved, selected fields (startup name, tagline, sector, city, website, public socials, founders' public profiles) appear on the public P@SHA directory. You can request removal at any time by emailing startups@pasha.org.pk.</p>
<h3>7. Sharing with third parties</h3>
<p>We do not sell your data. We may share aggregated, non-identifying statistics with partners and sponsors. Individual data is shared only with your consent or as required by law.</p>
<h3>8. Your rights</h3>
<p>You can access, correct, export, or delete your data at any time from the applicant dashboard or by contacting us. Deleting your account removes your directory listing and severs further committee communication.</p>
<h3>9. Changes to this agreement</h3>
<p>We may update these terms from time to time. Material changes will be communicated by email and will require renewed consent before continued use of the portal.</p>
<h3>10. Contact</h3>
<p>For questions about this agreement or your data, contact the P@SHA team at startups@pasha.org.pk.</p>`,
  },
};

export function isSiteContentSlug(v: string): v is SiteContentSlug {
  return (SITE_CONTENT_SLUGS as readonly string[]).includes(v);
}
