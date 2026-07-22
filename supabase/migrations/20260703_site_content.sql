-- Admin-editable singleton content blocks (privacy policy / terms, etc.),
-- keyed by a stable slug. Rendered to applicants (terms modal) and edited from
-- the admin portal → Privacy & Terms.

CREATE TABLE IF NOT EXISTS public.site_content (
  slug        text PRIMARY KEY,
  title       text NOT NULL DEFAULT '',
  body        text NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text
);

COMMENT ON TABLE public.site_content IS
  'Admin-editable singleton content blocks (privacy policy, terms, etc.) keyed by slug.';

-- Seed the privacy/terms block with the original hardcoded copy so the modal
-- keeps its content after the switch to dynamic storage. ON CONFLICT DO NOTHING
-- so re-running never clobbers admin edits.
INSERT INTO public.site_content (slug, title, body) VALUES
(
  'privacy_policy',
  'PASHA Startup Hub — Terms',
  '<p><em>Draft for review — the binding version will be issued by PASHA legal counsel.</em></p>
<h3>1. Acceptance of terms</h3>
<p>By creating an account on the PASHA Startup Hub portal you confirm that you have read, understood and agree to be bound by these terms. If you are registering on behalf of a company, you confirm you are authorised to do so.</p>
<h3>2. Account &amp; eligibility</h3>
<p>Accounts are intended for founders, employees, or authorised representatives of a registered or prospective Pakistani technology startup. You agree to provide accurate information and keep your contact details up to date so the committee can reach you.</p>
<h3>3. Use of the platform</h3>
<p>You may use the portal to submit your application, manage your public directory listing, and engage with PASHA programmes. You agree not to misuse the platform, attempt to access other applicants'' data, upload unlawful or infringing content, or interfere with the service.</p>
<h3>4. Data we collect</h3>
<p>We collect the information you provide in your application (company, founders, funding, documents) plus standard technical metadata (IP, device, timestamps). Uploaded documents (pitch deck, CNIC/passport, registration certificates) are stored privately and shared only with the committee.</p>
<h3>5. How we use it</h3>
<p>Your application is used to (a) verify eligibility, (b) compute vetting tiers, (c) display approved listings on the public directory, and (d) inform you of relevant PASHA events and opportunities. Personally identifying documents are never published.</p>
<h3>6. Public directory</h3>
<p>Once approved, selected fields (startup name, tagline, sector, city, website, public socials, founders'' public profiles) appear on the public PASHA directory. You can request removal at any time by emailing startups@pasha.org.pk.</p>
<h3>7. Sharing with third parties</h3>
<p>We do not sell your data. We may share aggregated, non-identifying statistics with partners and sponsors. Individual data is shared only with your consent or as required by law.</p>
<h3>8. Your rights</h3>
<p>You can access, correct, export, or delete your data at any time from the applicant dashboard or by contacting us. Deleting your account removes your directory listing and severs further committee communication.</p>
<h3>9. Changes to this agreement</h3>
<p>We may update these terms from time to time. Material changes will be communicated by email and will require renewed consent before continued use of the portal.</p>
<h3>10. Contact</h3>
<p>For questions about this agreement or your data, contact the PASHA team at startups@pasha.org.pk.</p>'
)
ON CONFLICT (slug) DO NOTHING;
