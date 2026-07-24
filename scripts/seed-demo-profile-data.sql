-- Demo profile data for the homepage "Women-led" and "Featured" startups.
--
-- WHY: the rows and their card fields (name / tagline / logo / sector / city /
-- stage) are already populated, so both homepage sections render. What was empty
-- is the profile-depth fields the /directory/[slug] page renders — business_model,
-- social_impact, sdgs, awards, certifications, incubation details and the
-- traction numbers — so clicking a card landed on a near-empty profile.
--
-- SAFE / IDEMPOTENT: every column uses COALESCE(existing, demo), so this only
-- fills blanks and never overwrites data that is already there. Re-running is a
-- no-op. Sector, city and logo are deliberately NOT touched.
--
-- Paste into Supabase Dashboard -> SQL Editor -> Run.

WITH city AS (
  SELECT option_value AS v, option_id AS id FROM options WHERE option_type = 'HQ_CITIES'
),
nic AS (
  SELECT option_value AS v, option_id AS id FROM options WHERE option_type = 'NIC_CENTERS'
),
demo (
  id, city_name, nic_v, incubation_stage, cohort,
  jobs_created, current_revenue, investment_raised, company_linkedin,
  business_model, social_impact, sdgs, awards, certifications,
  total_employees, female_employees, number_of_customers
) AS (
  VALUES
  -- ── Women-led ────────────────────────────────────────────────────────────
  ('1138e878-abaf-42b4-8ebf-d5ffa3c70ea5', 'Karachi', 'NIC Karachi', 'Graduated', 'Cohort 11 (2024)',
   '14', '18500000', '6500000', 'https://www.linkedin.com/company/technova-solutions-pk',
   '<p>B2B SaaS sold on annual subscriptions, tiered by number of automated workflows, with a one-time integration fee for enterprise rollouts.</p>',
   '<p>Automation tooling priced for small businesses that cannot afford enterprise software, with half the engineering team hired from women returning to work after a career break.</p>',
   'SDG 5 - Gender Equality, SDG 8 - Decent Work and Economic Growth, SDG 9 - Industry, Innovation and Infrastructure',
   'Finalist - PASHA ICT Awards 2025 (Emerging Tech)', 'ISO 27001:2022, SECP registered', NULL, NULL, NULL),

  ('29e09429-df34-41a7-a3fa-72d901f76625', 'Multan', 'NIC Lahore', 'Graduated', 'Cohort 9 (2023)',
   '62', '41000000', '15000000', 'https://www.linkedin.com/company/agrovision-technologies-pk',
   '<p>Per-acre annual subscription for satellite crop monitoring, plus revenue share on inputs bought through the platform by partner dealers.</p>',
   '<p>Advisory delivered in Urdu and Saraiki to smallholder farms under 12 acres, cutting water use and raising per-acre yield for growers with no prior access to agronomy support.</p>',
   'SDG 2 - Zero Hunger, SDG 12 - Responsible Consumption and Production, SDG 13 - Climate Action',
   'Winner - National AgriTech Challenge 2024', 'Global GAP advisory partner, SECP registered', NULL, NULL, NULL),

  ('bc07c39e-18c4-4b42-ad4d-246dae1bac8e', 'Karachi', 'NIC Karachi', 'Graduated', 'Cohort 10 (2024)',
   '38', '52000000', '21000000', 'https://www.linkedin.com/company/cybershield-pro',
   '<p>Managed detection and response on a monthly retainer per endpoint, with project-based penetration testing and compliance readiness audits.</p>',
   '<p>Brings enterprise-grade security monitoring within reach of mid-market banks and hospitals, and runs a free security clinic for non-profits handling sensitive citizen data.</p>',
   'SDG 9 - Industry, Innovation and Infrastructure, SDG 16 - Peace, Justice and Strong Institutions',
   'Finalist - PASHA ICT Awards 2025 (Cybersecurity)', 'ISO 27001:2022, SOC 2 Type II, PCI DSS QSA partner', NULL, NULL, NULL),

  ('ce0dcd76-23d2-49b8-a3dc-a0c4d01ea68e', 'Islamabad', 'NIC Islamabad', 'Graduated', 'Cohort 8 (2023)',
   '410', '96000000', '34000000', 'https://www.linkedin.com/company/ecomart-pk',
   '<p>Marketplace commission of 12 to 18 percent per order, plus fulfilment and last-mile delivery fees charged to sellers on the managed logistics tier.</p>',
   '<p>Routes demand to certified sustainable and locally made goods, onboarding home-based producers who previously had no route to a national customer base.</p>',
   'SDG 8 - Decent Work and Economic Growth, SDG 11 - Sustainable Cities and Communities, SDG 12 - Responsible Consumption and Production',
   'Winner - Green Commerce Award 2024', 'SECP registered, Pakistan Single Window onboarded', NULL, NULL, NULL),

  ('b06c37c8-da1a-4616-9c7b-9304e455226e', 'Islamabad', 'NIC Islamabad', 'In incubation', 'Cohort 12 (2025)',
   '24', '27500000', '9000000', 'https://www.linkedin.com/company/work-generations',
   '<p>Earned wage access funded on a per-transaction fee paid by the employer, with a SaaS payroll module billed per employee per month.</p>',
   '<p>Gives salaried workers access to earned pay before payday, displacing informal lenders that charge punitive rates to households living between salary cycles.</p>',
   'SDG 1 - No Poverty, SDG 8 - Decent Work and Economic Growth, SDG 10 - Reduced Inequalities',
   'Selected - SBP Regulatory Sandbox cohort 2025', 'SECP registered, SBP sandbox participant', NULL, NULL, NULL),

  ('9f39cc8f-cc40-477f-a5f3-8cd460ac89b1', 'Lahore', 'NIC Lahore', 'Graduated', 'Cohort 7 (2022)',
   '450', '128000000', '45000000', 'https://www.linkedin.com/company/tech-center-pk',
   '<p>Applied AI delivery on retainer for enterprise clients, alongside a licensed document-intelligence product billed per processed page.</p>',
   '<p>Three quarters of the workforce is women, with a paid returnship track that retrains graduates from non-metro campuses into applied machine learning roles.</p>',
   'SDG 4 - Quality Education, SDG 5 - Gender Equality, SDG 8 - Decent Work and Economic Growth',
   'Winner - PASHA ICT Awards 2024 (AI and Data)', 'ISO 9001:2015, ISO 27001:2022', NULL, NULL, NULL),

  ('e8d1b18e-7d74-4348-85c0-453ebda415da', 'Lahore', 'NIC Lahore', 'Graduated', 'Cohort 10 (2024)',
   '68', '34000000', '12500000', 'https://www.linkedin.com/company/sheempower-pk',
   '<p>Blended model: employer-funded cohort sponsorships for upskilling programmes, plus a low-cost monthly learner subscription for self-paced tracks.</p>',
   '<p>Trains women in tier-2 and tier-3 cities for remote technical work, with placement support and stipends that remove the cost barrier for first-generation earners.</p>',
   'SDG 4 - Quality Education, SDG 5 - Gender Equality, SDG 10 - Reduced Inequalities',
   'Winner - Women in Tech Pakistan 2025', 'SECP registered, PSEB registered', NULL, NULL, NULL),

  ('6112efe9-071c-47e2-a824-734f2d6c9af1', 'Faisalabad', 'NIC Faisalabad', 'In incubation', 'Cohort 12 (2025)',
   '58', '22000000', '7500000', 'https://www.linkedin.com/company/3d-stitched',
   '<p>Per-unit fee on digitally sampled garments, plus a licensed 3D pattern studio sold to exporters on an annual seat-based subscription.</p>',
   '<p>Replaces physical sampling in the Faisalabad textile cluster, cutting fabric waste and giving stitching units predictable digital orders instead of seasonal work.</p>',
   'SDG 8 - Decent Work and Economic Growth, SDG 9 - Industry, Innovation and Infrastructure, SDG 12 - Responsible Consumption and Production',
   'Finalist - Textile Innovation Award 2025', 'OEKO-TEX partner mill network, SECP registered', NULL, NULL, NULL),

  -- ── Featured (not women-led) ─────────────────────────────────────────────
  ('02e88cf0-654e-4381-b94b-baa48bc6fbf8', 'Islamabad', 'NIC Islamabad', 'Graduated', 'Cohort 6 (2022)',
   '1150', '480000000', '210000000', 'https://www.linkedin.com/company/laam-pk',
   '<p>Curated fashion marketplace earning commission per order, with paid brand placement and a managed fulfilment tier for smaller labels.</p>',
   '<p>Gives independent designers and heritage craft ateliers a direct export channel, shifting margin back to makers rather than intermediaries.</p>',
   'SDG 8 - Decent Work and Economic Growth, SDG 9 - Industry, Innovation and Infrastructure',
   'Winner - Retail Innovation Award 2024', 'SECP registered, PSEB registered', NULL, NULL, NULL),

  ('4717e455-6f6f-47fb-81ef-59343ec912a0', 'Karachi', 'NIC Karachi', 'Graduated', 'Cohort 8 (2023)',
   '110', '210000000', '95000000', 'https://www.linkedin.com/company/abhi-pk',
   '<p>Earned wage access and invoice financing, monetised through a flat transaction fee to the employer and a discount rate on financed receivables.</p>',
   '<p>Breaks the payday lending cycle for salaried staff and unlocks working capital for SME suppliers that banks will not underwrite.</p>',
   'SDG 1 - No Poverty, SDG 8 - Decent Work and Economic Growth, SDG 10 - Reduced Inequalities',
   'Winner - Fintech of the Year 2024', 'SECP NBFC licensed, ISO 27001:2022', NULL, NULL, '18500'),

  ('4fa9e3ba-4336-44d0-aacf-e5bce677cd13', 'Lahore', 'NIC Lahore', 'Graduated', 'Cohort 5 (2021)',
   '340', '160000000', '58000000', 'https://www.linkedin.com/company/bookme-pk',
   '<p>Online ticketing for bus, air, cinema and events, earning a booking fee per ticket plus inventory deals with operators.</p>',
   '<p>Puts verified fares and seat availability in one place for intercity travellers, reducing dependence on cash-only agents in smaller towns.</p>',
   'SDG 8 - Decent Work and Economic Growth, SDG 9 - Industry, Innovation and Infrastructure, SDG 11 - Sustainable Cities and Communities',
   'Winner - Consumer Tech Award 2023', 'SECP registered, PCI DSS compliant', NULL, NULL, NULL),

  ('6807d6ff-7d20-4103-a973-828b1cf3f218', 'Karachi', 'NIC Karachi', 'In incubation', 'Cohort 12 (2025)',
   '26', '14500000', '5000000', 'https://www.linkedin.com/company/fortanixor-technologies',
   '<p>Applied AI consulting billed per engagement, converting into a licensed forecasting product sold to logistics and retail clients annually.</p>',
   '<p>Builds local machine learning capability by training its delivery team in-house rather than hiring only from abroad, retaining talent in Pakistan.</p>',
   'SDG 8 - Decent Work and Economic Growth, SDG 9 - Industry, Innovation and Infrastructure',
   'Finalist - National AI Challenge 2025', 'SECP registered, PSEB registered', '24', '9', '40'),

  ('83c592a7-0491-4cb3-ad76-5448f7f3481d', 'Karachi', 'NIC Karachi', 'Graduated', 'Cohort 4 (2021)',
   '8600', '920000000', '350000000', 'https://www.linkedin.com/company/uber-pk-demo',
   '<p>Marketplace take rate on every completed booking, with subscription tiers for high-frequency partners and commercial property listings.</p>',
   '<p>Creates flexible earning opportunities for partner drivers and agents, with in-app safety tooling and earnings transparency as standard.</p>',
   'SDG 8 - Decent Work and Economic Growth, SDG 11 - Sustainable Cities and Communities',
   'Winner - Mobility Platform of the Year 2023', 'ISO 27001:2022, SECP registered', NULL, NULL, NULL),

  ('8dce3042-d10f-4836-a828-c754b99b69ac', 'Faisalabad', 'NIC Faisalabad', 'Graduated', 'Cohort 9 (2023)',
   '540', '145000000', '40000000', 'https://www.linkedin.com/company/codehive-pk',
   '<p>Engineering delivery pods billed monthly per pod, moving strategic clients onto a fixed-scope product build model with an equity component.</p>',
   '<p>Keeps senior engineering work in Faisalabad rather than concentrating it in Lahore or Karachi, with a paid apprenticeship for local graduates.</p>',
   'SDG 4 - Quality Education, SDG 8 - Decent Work and Economic Growth, SDG 9 - Industry, Innovation and Infrastructure',
   'Finalist - PASHA ICT Awards 2024 (IT Services)', 'ISO 9001:2015, PSEB registered', NULL, NULL, '85'),

  ('a2ee9d1c-0cd2-4bcf-8e5c-1cc3a3d82462', 'Lahore', 'NIC Lahore', 'In incubation', 'Cohort 12 (2025)',
   '4', '2400000', '1500000', 'https://www.linkedin.com/company/ranksmith',
   '<p>Self-serve SaaS on monthly per-seat pricing, with a usage-based tier for agencies managing multiple client workspaces.</p>',
   '<p>Gives small local businesses affordable search visibility tooling that was previously only viable for agencies with retainer budgets.</p>',
   'SDG 8 - Decent Work and Economic Growth, SDG 9 - Industry, Innovation and Infrastructure',
   'Selected - NIC Lahore Cohort 12', 'SECP registered', NULL, NULL, NULL),

  ('bdf844d5-ec17-4222-bb13-512fa10cb59d', 'Quetta', 'NIC Quetta', 'In incubation', 'Cohort 12 (2025)',
   '18', '8500000', '2800000', 'https://www.linkedin.com/company/she-bakes-pk',
   '<p>Cloud bakery selling direct to consumers online, plus wholesale supply to cafes and a paid home-baker certification programme.</p>',
   '<p>Turns home baking into formal income for women in Quetta, providing food-safety training, shared kitchen access and a route to market.</p>',
   'SDG 5 - Gender Equality, SDG 8 - Decent Work and Economic Growth, SDG 12 - Responsible Consumption and Production',
   'Winner - Balochistan Women Entrepreneurs Award 2025', 'PSQCA food safety compliant, SECP registered',
   '22', '20', '1400'),

  ('d8a1b9c0-e580-490b-b995-3b8b2e762223', 'Karachi', 'NIC Karachi', 'Graduated', 'Cohort 5 (2021)',
   '2400', '380000000', '160000000', 'https://www.linkedin.com/company/bykea-pk-demo',
   '<p>Commission on every ride, delivery and cash transaction on the network, with advertising and partner payment services layered on top.</p>',
   '<p>Provides flexible income to partner riders across dense urban areas and extends low-cost delivery to neighbourhoods mainstream logistics does not serve.</p>',
   'SDG 8 - Decent Work and Economic Growth, SDG 11 - Sustainable Cities and Communities',
   'Winner - Logistics Innovation Award 2023', 'ISO 27001:2022, SECP registered',
   '620', '95', '32000')
)
UPDATE databank d
SET
  -- options.option_id is UUID while these columns are TEXT, so cast before COALESCE.
  city                = COALESCE(NULLIF(d.city, ''),                c.id::text),
  nic_name            = COALESCE(NULLIF(d.nic_name, ''),            n.id::text),
  incubation_stage    = COALESCE(NULLIF(d.incubation_stage, ''),    x.incubation_stage),
  cohort              = COALESCE(NULLIF(d.cohort, ''),              x.cohort),
  company_linkedin    = COALESCE(NULLIF(d.company_linkedin, ''),    x.company_linkedin),
  business_model      = COALESCE(NULLIF(d.business_model, ''),      x.business_model),
  social_impact       = COALESCE(NULLIF(d.social_impact, ''),       x.social_impact),
  sdgs                = COALESCE(NULLIF(d.sdgs, ''),                x.sdgs),
  awards              = COALESCE(NULLIF(d.awards, ''),              x.awards),
  certifications      = COALESCE(NULLIF(d.certifications, ''),      x.certifications),
  jobs_created        = COALESCE(d.jobs_created,        x.jobs_created::int),
  current_revenue     = COALESCE(d.current_revenue,     x.current_revenue::numeric),
  investment_raised   = COALESCE(d.investment_raised,   x.investment_raised::numeric),
  total_employees     = COALESCE(d.total_employees,     x.total_employees::int),
  female_employees    = COALESCE(d.female_employees,    x.female_employees::int),
  -- NOTE: databank has no general `updated_at` column (only created_at,
  -- source_updated_at and pasha_verified_at), so nothing is stamped here.
  number_of_customers = COALESCE(d.number_of_customers, x.number_of_customers::int)
FROM demo x
LEFT JOIN city c ON c.v = x.city_name
LEFT JOIN nic  n ON n.v = x.nic_v
WHERE d.id = x.id::uuid;
