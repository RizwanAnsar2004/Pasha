-- Full post-login application form (spec §4–§11), built on the dynamic form
-- builder. Rebuilds the 'application' form into 7 steps that mirror the spec's
-- dashboard modules:
--
--   1. Startup            (§4 identity, brand, links + §11 mandatory card fields)
--   2. Founders & team    (§5)
--   3. Business profile   (§6 problem / solution / product / USP / GTM)
--   4. Market & competition (§7 competitors + TAM/SAM/SOM)
--   5. Traction & funding (§8)
--   6. Operations & collaboration (§9 hiring / partnerships / women-led)
--   7. Documents & verification   (§10 — applicant-supplied docs only)
--
-- Fields with a column_map write to a real submissions column (kept for vetting
-- and the public directory). Every new spec field has column_map = NULL, so the
-- submit pipeline routes it into submissions.answers (JSONB) automatically — no
-- schema change needed. Fields already captured at registration (startup_name,
-- tagline, location, stage, primary_sector) are shown here PRE-FILLED from the
-- registration draft (same field_keys), so the founder can review/edit them —
-- they are not re-hidden. The §3 founder details (full_name, mobile) prefill
-- the primary founder card via seedApplicantDraft().
--
-- Idempotent-ish: scoped DELETE + re-INSERT of the application form only;
-- registration sections/fields are never touched. Re-running resets the
-- application form to this spec. Drafts keep prefilling because field_keys are
-- preserved across the rebuild.
--
-- input_type ints: 0 text 1 email 2 url 3 phone 4 number 5 textarea 6 select
-- 7 multiselect 8 yes/no 9 radio 10 date 20 group 30 heading 90 file 91 city.

BEGIN;

-- ---- Remove the existing application-form definition (NOT registration) -----
DELETE FROM form_fields
WHERE section_id IN (
  SELECT id FROM form_sections WHERE form_key = 'application' OR form_key IS NULL
);
DELETE FROM form_sections
WHERE form_key = 'application' OR form_key IS NULL;

-- ---- Steps (one section = one step) -----------------------------------------
INSERT INTO form_sections (key, title, subtitle, step, sort_order, is_active, form_key) VALUES
  ('identity',   'Startup',                  'Your public identity — name, brand, sector and links shown on your directory card.',                 1, 0, true, 'application'),
  ('founders',   'Founders & team',          'The people behind the startup. Contact details stay private unless you choose to show them.',         2, 1, true, 'application'),
  ('business',   'Business profile',         'What you do, how you solve it and what makes you different.',                                          3, 2, true, 'application'),
  ('market',     'Market & competition',     'Competitors and market sizing. Kept private / investor-only by default.',                             4, 3, true, 'application'),
  ('traction',   'Traction & funding',       'Traction and funding signals. Use ranges — exact figures are never required.',                        5, 4, true, 'application'),
  ('operations', 'Operations & collaboration','Hiring, partnerships, programs and women-led tagging.',                                              6, 5, true, 'application'),
  ('documents',  'Documents & verification', 'Supporting documents for committee review. Stored privately — never shown on public pages.',           7, 6, true, 'application');

-- =============================================================================
-- Step 1 — Startup (§4 + §11 mandatory public fields)
-- =============================================================================
INSERT INTO form_fields
  (section_id, parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
SELECT s.id, x.parent_field_id, x.field_key, x.label, x.hint, x.placeholder, x.input_type, x.required, x.validation, x.options, x.options_source, x.repeatable, x.min_items, x.max_items, x.item_label, x.column_map, x.visible, x.sort_order, x.conditional
FROM form_sections s
CROSS JOIN (VALUES
  (NULL::uuid,'h_identity','Identity',NULL::text,NULL::text,30,false,'{}'::jsonb,NULL::jsonb,NULL::text,false,NULL::int,NULL::int,NULL::text,NULL::text,true,0,NULL::jsonb),
  -- captured at registration → shown PRE-FILLED here so the founder can edit it
  (NULL,'startup_name','Startup name',NULL,'Acme Inc.',0,true,'{"minLength":2}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'startup_name',true,1,NULL),
  (NULL,'legal_company_name','Legal company name','As registered with SECP/FBR. Used on your profile page only.','Acme (Private) Limited',0,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,2,NULL),
  (NULL,'tagline','One-line description','Shown on your directory card. Max 160 characters.','We help X do Y',0,true,'{"maxLength":160}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'tagline',true,3,NULL),
  (NULL,'description','Detailed description','Full profile content shown on your public profile. At least 50 characters.',NULL,5,true,'{"minLength":50,"maxLength":2000}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'description',true,4,NULL),
  (NULL,'year_founded','Year founded',NULL,'2021',0,false,'{"pattern":"^(19|20)\\d{2}$"}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'year_founded',true,5,NULL),

  (NULL,'h_brand','Brand assets',NULL,NULL,30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,6,NULL),
  (NULL,'logo_url','Startup logo','Required for a polished directory card.',NULL,90,false,'{"bucket":"logos","maxSizeMB":5,"accept":{"image/*":[".png",".jpg",".jpeg",".webp"]}}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'logo_url',true,7,NULL),
  (NULL,'cover_image','Cover image','Shown on your profile header. A placeholder is generated if you skip this.',NULL,90,false,'{"bucket":"logos","maxSizeMB":5,"accept":{"image/*":[".png",".jpg",".jpeg",".webp"]}}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,8,NULL),

  (NULL,'h_location','Location',NULL,NULL,30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,9,NULL),
  -- captured at registration → shown PRE-FILLED; value routes to hq_* columns
  (NULL,'location','Headquarters',NULL,NULL,91,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,10,NULL),

  (NULL,'h_category','Category',NULL,NULL,30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,11,NULL),
  (NULL,'primary_sector','Primary sector',NULL,'Pick a sector',6,true,'{}'::jsonb,NULL,'SECTORS',false,NULL,NULL,NULL,'primary_sector',true,12,NULL),
  (NULL,'secondary_sector','Secondary sector','Optional.','Select…',6,false,'{}'::jsonb,NULL,'SECTORS',false,NULL,NULL,NULL,'secondary_sector',true,13,NULL),
  (NULL,'business_model','Business model','Required before publishing.','Select…',6,true,'{}'::jsonb,NULL,'BUSINESS_MODELS',false,NULL,NULL,NULL,'business_model',true,14,NULL),
  (NULL,'stage','Current stage',NULL,'Pick a stage',6,true,'{}'::jsonb,NULL,'STAGES',false,NULL,NULL,NULL,'stage',true,15,NULL),
  (NULL,'team_size','Team size','Startup maturity filter on the directory.','Select…',6,false,'{}'::jsonb,NULL,'TEAM_SIZES',false,NULL,NULL,NULL,NULL,true,16,NULL),

  (NULL,'h_links','Links & contact',NULL,NULL,30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,17,NULL),
  (NULL,'website','Website',NULL,'https://',2,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'website',true,18,NULL),
  (NULL,'company_linkedin','Company LinkedIn',NULL,'https://',2,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'company_linkedin',true,19,NULL),
  (NULL,'company_x','Company X / Twitter',NULL,'https://',2,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'company_x',true,20,NULL),
  (NULL,'company_instagram','Company Instagram',NULL,'https://',2,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'company_instagram',true,21,NULL),
  (NULL,'company_facebook','Company Facebook',NULL,'https://',2,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'company_facebook',true,22,NULL),
  (NULL,'company_youtube','Company YouTube',NULL,'https://',2,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'company_youtube',true,23,NULL),
  (NULL,'contact_preference','Public contact preference','How visitors can reach you. We recommend a contact form to reduce spam.','Select…',6,false,'{}'::jsonb,NULL,'CONTACT_PREFERENCES',false,NULL,NULL,NULL,NULL,true,24,NULL)
) AS x(parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
WHERE s.key = 'identity' AND s.form_key = 'application';

-- =============================================================================
-- Step 2 — Founders & team (§5)
-- =============================================================================
INSERT INTO form_fields
  (section_id, parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
SELECT s.id, x.parent_field_id, x.field_key, x.label, x.hint, x.placeholder, x.input_type, x.required, x.validation, x.options, x.options_source, x.repeatable, x.min_items, x.max_items, x.item_label, x.column_map, x.visible, x.sort_order, x.conditional
FROM form_sections s
CROSS JOIN (VALUES
  (NULL::uuid,'h_founders','Founders',NULL::text,'Add each founder and co-founder. Email, phone and WhatsApp stay private unless you choose to show them.'::text,30,false,'{}'::jsonb,NULL::jsonb,NULL::text,false,NULL::int,NULL::int,NULL::text,NULL::text,true,0,NULL::jsonb),
  -- the founders repeater (name, role, email, phone, linkedin, gender, photo, primary)
  (NULL,'founders','Founders & co-founders',NULL,NULL,20,false,'{}'::jsonb,NULL,NULL,true,1,NULL,'Founder','founders',true,1,NULL),
  (NULL,'h_team','Team',NULL,NULL,30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,2,NULL),
  (NULL,'founder_bio','Primary founder bio','Strongly recommended for investor-ready profiles. Private by default.',NULL,5,false,'{"maxLength":1200}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,3,NULL),
  (NULL,'total_employees','Total employees',NULL,NULL,4,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'total_employees',true,4,NULL),
  (NULL,'female_employees','Female employees',NULL,NULL,4,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'female_employees',true,5,NULL)
) AS x(parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
WHERE s.key = 'founders' AND s.form_key = 'application';

-- =============================================================================
-- Step 3 — Business profile (§6)
-- =============================================================================
INSERT INTO form_fields
  (section_id, parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
SELECT s.id, x.parent_field_id, x.field_key, x.label, x.hint, x.placeholder, x.input_type, x.required, x.validation, x.options, x.options_source, x.repeatable, x.min_items, x.max_items, x.item_label, x.column_map, x.visible, x.sort_order, x.conditional
FROM form_sections s
CROSS JOIN (VALUES
  (NULL::uuid,'h_problem','Problem & solution',NULL::text,NULL::text,30,false,'{}'::jsonb,NULL::jsonb,NULL::text,false,NULL::int,NULL::int,NULL::text,NULL::text,true,0,NULL::jsonb),
  (NULL,'problem_statement','What customer problem are you solving?',NULL,NULL,5,false,'{"maxLength":1200}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,1,NULL),
  (NULL,'solution_statement','How does your startup solve this problem?',NULL,NULL,5,false,'{"maxLength":1200}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,2,NULL),
  (NULL,'usp','What makes your startup different?','Your unique selling point / competitive advantage.',NULL,5,false,'{"maxLength":1200}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,3,NULL),

  (NULL,'h_product','Product',NULL,NULL,30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,4,NULL),
  (NULL,'product_features','Key product features','One per line — what your product does.',NULL,5,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,5,NULL),
  (NULL,'product_maturity','Product maturity',NULL,'Select…',6,false,'{}'::jsonb,NULL,'PRODUCT_MATURITY',false,NULL,NULL,NULL,NULL,true,6,NULL),
  (NULL,'target_customers','Primary customers',NULL,NULL,7,false,'{}'::jsonb,NULL,'TARGET_CUSTOMERS',false,NULL,NULL,NULL,NULL,true,7,NULL),
  (NULL,'gtm_channels','Sales / GTM channels','Private by default.',NULL,7,false,'{}'::jsonb,NULL,'GTM_CHANNELS',false,NULL,NULL,NULL,NULL,true,8,NULL),

  (NULL,'h_product_links','Product links',NULL,NULL,30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,9,NULL),
  (NULL,'demo_video_url','Demo video URL',NULL,'https://',2,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,10,NULL),
  (NULL,'app_store_url','App Store URL',NULL,'https://',2,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,11,NULL),
  (NULL,'play_store_url','Google Play URL',NULL,'https://',2,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,12,NULL),
  (NULL,'product_screenshots','Product screenshots','Shown in your profile gallery.',NULL,90,false,'{"bucket":"logos","maxSizeMB":5,"accept":{"image/*":[".png",".jpg",".jpeg",".webp"]}}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,13,NULL)
) AS x(parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
WHERE s.key = 'business' AND s.form_key = 'application';

-- =============================================================================
-- Step 4 — Market & competition (§7) — investor-only / private by default
-- =============================================================================
INSERT INTO form_fields
  (section_id, parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
SELECT s.id, x.parent_field_id, x.field_key, x.label, x.hint, x.placeholder, x.input_type, x.required, x.validation, x.options, x.options_source, x.repeatable, x.min_items, x.max_items, x.item_label, x.column_map, x.visible, x.sort_order, x.conditional
FROM form_sections s
CROSS JOIN (VALUES
  (NULL::uuid,'h_competition','Competition',NULL::text,'Optional and private by default — useful for committee and investor evaluation.'::text,30,false,'{}'::jsonb,NULL::jsonb,NULL::text,false,NULL::int,NULL::int,NULL::text,NULL::text,true,0,NULL::jsonb),
  (NULL,'competitors_global','Global competitors','One per line, with a link if you have it.',NULL,5,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,1,NULL),
  (NULL,'competitors_pk','Pakistan competitors','One per line, with a link if you have it.',NULL,5,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,2,NULL),
  (NULL,'competitor_notes','How you compare','What makes you different from the competitors above.',NULL,5,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,3,NULL),

  (NULL,'h_market','Market sizing',NULL,'Exact numbers are optional for early-stage startups.',30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,4,NULL),
  (NULL,'tam_amount','TAM — total addressable market (USD)','Total market opportunity globally or regionally.','e.g. 5000000000',4,false,'{"integer":false}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,5,NULL),
  (NULL,'sam_amount','SAM — serviceable available market (USD)','The market you can realistically serve.','e.g. 800000000',4,false,'{"integer":false}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,6,NULL),
  (NULL,'som_amount','SOM — serviceable obtainable market (USD)','Expected share over the next 3–5 years.','e.g. 50000000',4,false,'{"integer":false}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,7,NULL),
  (NULL,'market_notes','Market sizing notes & assumptions',NULL,NULL,5,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,8,NULL),
  (NULL,'market_source','Source / reference link','Report, public source or internal estimate.','https://',2,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,9,NULL)
) AS x(parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
WHERE s.key = 'market' AND s.form_key = 'application';

-- =============================================================================
-- Step 5 — Traction & funding (§8) — use ranges, never exact figures
-- =============================================================================
INSERT INTO form_fields
  (section_id, parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
SELECT s.id, x.parent_field_id, x.field_key, x.label, x.hint, x.placeholder, x.input_type, x.required, x.validation, x.options, x.options_source, x.repeatable, x.min_items, x.max_items, x.item_label, x.column_map, x.visible, x.sort_order, x.conditional
FROM form_sections s
CROSS JOIN (VALUES
  (NULL::uuid,'h_traction','Traction',NULL::text,'Private by default — share with investors only if you choose.'::text,30,false,'{}'::jsonb,NULL::jsonb,NULL::text,false,NULL::int,NULL::int,NULL::text,NULL::text,true,0,NULL::jsonb),
  (NULL,'monthly_active_users','Monthly active users',NULL,NULL,4,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,1,NULL),
  (NULL,'num_customers','Number of customers','Use a range below if you prefer not to share an exact number.','Select…',6,false,'{}'::jsonb,NULL,'CUSTOMER_BANDS',false,NULL,NULL,NULL,NULL,true,2,NULL),
  (NULL,'monthly_revenue_range','Monthly revenue range',NULL,'Select…',6,false,'{}'::jsonb,NULL,'MONTHLY_REVENUE_RANGES',false,NULL,NULL,NULL,NULL,true,3,NULL),
  (NULL,'revenue_band','Annual revenue range',NULL,'Select…',6,false,'{}'::jsonb,NULL,'REVENUE_BANDS',false,NULL,NULL,NULL,'revenue_band',true,4,NULL),
  (NULL,'growth_rate','Growth rate','e.g. "20% MoM" or "3x YoY".',NULL,0,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,5,NULL),
  (NULL,'major_clients','Major clients','One per line. Some may be confidential — share only what you can.',NULL,5,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,6,NULL),
  (NULL,'partnerships','Partnerships','One per line.',NULL,5,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,7,NULL),

  (NULL,'h_recognition','Recognition',NULL,NULL,30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,8,NULL),
  (NULL,'awards','Awards & recognition','One per line. A public credibility signal.',NULL,5,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'awards',true,9,NULL),
  (NULL,'media_coverage','Media coverage links','One link per line.',NULL,5,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,10,NULL),

  (NULL,'h_funding','Funding',NULL,NULL,30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,11,NULL),
  (NULL,'funding_status','Funding status',NULL,'Select…',6,false,'{}'::jsonb,NULL,'FUNDING_STATUS',false,NULL,NULL,NULL,NULL,true,12,NULL),
  (NULL,'total_funding_raised','Total funding raised','Use a range — investor-only by default.','Select…',6,false,'{}'::jsonb,NULL,'FUNDING_AMOUNT_RANGES',false,NULL,NULL,NULL,NULL,true,13,NULL),
  (NULL,'currently_raising','Currently fundraising?',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'currently_raising',true,14,NULL),
  (NULL,'amount_raising','Amount raising','Shown to approved investors only.','Select…',6,false,'{}'::jsonb,NULL,'FUNDING_AMOUNT_RANGES',false,NULL,NULL,NULL,NULL,true,15,'{"field_key":"currently_raising","equals":true}'::jsonb),
  (NULL,'open_to_investor_contact','Open to investor contact?','Controls the investor CTA on your profile.',NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,16,NULL)
) AS x(parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
WHERE s.key = 'traction' AND s.form_key = 'application';

-- =============================================================================
-- Step 6 — Operations, collaboration & women-led (§9)
-- =============================================================================
INSERT INTO form_fields
  (section_id, parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
SELECT s.id, x.parent_field_id, x.field_key, x.label, x.hint, x.placeholder, x.input_type, x.required, x.validation, x.options, x.options_source, x.repeatable, x.min_items, x.max_items, x.item_label, x.column_map, x.visible, x.sort_order, x.conditional
FROM form_sections s
CROSS JOIN (VALUES
  (NULL::uuid,'h_operations','Operations',NULL::text,NULL::text,30,false,'{}'::jsonb,NULL::jsonb,NULL::text,false,NULL::int,NULL::int,NULL::text,NULL::text,true,0,NULL::jsonb),
  (NULL,'operating_markets','Operating markets',NULL,NULL,7,false,'{}'::jsonb,NULL,'OPERATING_MARKETS',false,NULL,NULL,NULL,NULL,true,1,NULL),
  (NULL,'office_type','Work model',NULL,'Select…',6,false,'{}'::jsonb,NULL,'OFFICE_TYPES',false,NULL,NULL,NULL,NULL,true,2,NULL),
  (NULL,'office_address','Office address','Private by default.',NULL,5,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,3,NULL),

  (NULL,'h_collaboration','Collaboration',NULL,'These power directory filters and committee programs.',30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,4,NULL),
  (NULL,'currently_hiring','Currently hiring?','Creates a hiring badge on your card.',NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,5,NULL),
  (NULL,'open_roles','Open roles','One per line.',NULL,5,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,6,'{"field_key":"currently_hiring","equals":true}'::jsonb),
  (NULL,'looking_for_mentors','Looking for mentors?',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,7,NULL),
  (NULL,'looking_for_partnerships','Looking for partnerships?',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,8,NULL),
  (NULL,'looking_for_corporate_clients','Looking for corporate clients?',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,9,NULL),
  (NULL,'looking_for_govt_support','Looking for government support?',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,10,NULL),

  (NULL,'h_women_led','Women-led',NULL,'The women-led badge appears publicly only if you opt in. Personal gender data stays private.',30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,11,NULL),
  (NULL,'women_led','Is this a women-led startup?','Shows the women-led badge when enabled.',NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,12,NULL),
  (NULL,'female_founder_name','Female founder / co-founder name','Private unless this person is already a listed founder and you choose public.',NULL,0,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,13,'{"field_key":"women_led","equals":true}'::jsonb),
  (NULL,'women_ownership_pct','Women ownership percentage','Private / analytics use unless you choose otherwise.','Select…',6,false,'{}'::jsonb,NULL,'WOMEN_OWNERSHIP_RANGES',false,NULL,NULL,NULL,NULL,true,14,'{"field_key":"women_led","equals":true}'::jsonb)
) AS x(parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
WHERE s.key = 'operations' AND s.form_key = 'application';

-- =============================================================================
-- Step 7 — Documents & verification (§10, applicant-supplied only)
-- Admin-only review fields (notes, scores, verification/featured status) are NOT
-- part of the applicant form — they live in the admin review workflow.
-- =============================================================================
INSERT INTO form_fields
  (section_id, parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
SELECT s.id, x.parent_field_id, x.field_key, x.label, x.hint, x.placeholder, x.input_type, x.required, x.validation, x.options, x.options_source, x.repeatable, x.min_items, x.max_items, x.item_label, x.column_map, x.visible, x.sort_order, x.conditional
FROM form_sections s
CROSS JOIN (VALUES
  (NULL::uuid,'h_docs','Documents',NULL::text,'Stored privately for committee review — never shown on public pages.'::text,30,false,'{}'::jsonb,NULL::jsonb,NULL::text,false,NULL::int,NULL::int,NULL::text,NULL::text,true,0,NULL::jsonb),
  (NULL,'pitch_deck_url','Pitch deck (PDF)',NULL,NULL,90,false,'{"bucket":"pitch-decks","maxSizeMB":10,"accept":{"application/pdf":[".pdf"]}}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'pitch_deck_url',true,1,NULL),
  (NULL,'business_profile_pdf','Business profile (PDF)','Optional one-pager. Investor-only by default.',NULL,90,false,'{"bucket":"pitch-decks","maxSizeMB":10,"accept":{"application/pdf":[".pdf"]}}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,2,NULL),

  (NULL,'h_verification','Verification (admin-only)',NULL,'Used by the committee to verify your startup. Admin-only — never public.',30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,3,NULL),
  (NULL,'company_reg_cert','Company registration certificate',NULL,NULL,90,false,'{"bucket":"pitch-decks","maxSizeMB":10,"accept":{"application/pdf":[".pdf"],"image/*":[".png",".jpg",".jpeg"]}}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,4,NULL),
  (NULL,'ntn_number','NTN / tax number',NULL,NULL,0,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,5,NULL),
  (NULL,'pasha_membership_number','P@SHA membership number','If you are already a P@SHA member.',NULL,0,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,6,NULL),
  (NULL,'authorization_letter','Authorization letter','Required only if you are a representative, not a founder.',NULL,90,false,'{"bucket":"pitch-decks","maxSizeMB":10,"accept":{"application/pdf":[".pdf"],"image/*":[".png",".jpg",".jpeg"]}}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,7,NULL),
  (NULL,'founder_cnic','Founder CNIC / passport','Only if high-trust verification is requested. Stored with strict access controls.',NULL,90,false,'{"bucket":"pitch-decks","maxSizeMB":10,"accept":{"application/pdf":[".pdf"],"image/*":[".png",".jpg",".jpeg"]}}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,8,NULL)
) AS x(parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
WHERE s.key = 'documents' AND s.form_key = 'application';

COMMIT;

-- Sanity check (optional):
-- SELECT s.step, s.title, count(f.*) AS fields
-- FROM form_sections s LEFT JOIN form_fields f ON f.section_id = s.id
-- WHERE s.form_key = 'application' GROUP BY s.step, s.title ORDER BY s.step;
