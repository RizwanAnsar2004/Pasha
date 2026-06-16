-- Seed the form builder with the current apply form (SECTION = STEP model).
-- Run AFTER supabase/migrations/20260615_form_builder.sql, in the Supabase
-- SQL editor. Idempotent: it resets form config to these defaults each run.
--
-- 3 sections = 3 steps (Startup / Founders / Recognition). Visual sub-groups
-- are HEADING fields (input_type 30, no value). Every value field carries a
-- column_map back to its existing submissions column, so vetting + the public
-- directory keep working. Founders = a repeatable GROUP (input_type 20).
--
-- input_type ints: 0 text 1 email 2 url 3 phone 4 number 5 textarea 6 select
-- 7 multiselect 8 yes/no 9 radio 10 date 20 group 30 heading 90 file 91 city.

BEGIN;

-- Reset (form_fields cascades from sections, but delete explicitly for clarity).
DELETE FROM form_fields;
DELETE FROM form_sections;

INSERT INTO form_sections (key, title, subtitle, step, sort_order, is_active) VALUES
  ('startup', 'Startup', 'About your company, where you operate, and how you reach customers', 1, 0, true),
  ('founders', 'Founders', 'The people running this startup — shown publicly as Key Persons', 2, 1, true),
  ('recognition', 'Recognition', 'Patents, awards, certifications, and community opt-ins', 3, 2, true);

-- ===== Step 1: Startup =====
INSERT INTO form_fields
  (section_id, parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
SELECT s.id, x.parent_field_id, x.field_key, x.label, x.hint, x.placeholder, x.input_type, x.required, x.validation, x.options, x.options_source, x.repeatable, x.min_items, x.max_items, x.item_label, x.column_map, x.visible, x.sort_order, x.conditional
FROM form_sections s
CROSS JOIN (VALUES
  (NULL::uuid,'h_basics','Basics',NULL::text,NULL::text,30,false,'{}'::jsonb,NULL::jsonb,NULL::text,false,NULL::int,NULL::int,NULL::text,NULL::text,true,0,NULL::jsonb),
  -- startup_name + tagline are collected at registration (spec §3) and prefill
  -- the draft; hidden here (visible=false) so they still route to their columns
  -- without re-asking. See 20260619_dedupe_registration_fields.sql.
  (NULL,'startup_name','Startup name',NULL,'Acme Inc.',0,false,'{"minLength":2}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'startup_name',false,1,NULL),
  (NULL,'tagline','Tagline',NULL,'One line on what you do',0,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'tagline',false,2,NULL),
  (NULL,'website','Website',NULL,'https://',2,true,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'website',true,3,NULL),
  (NULL,'year_founded','Year founded',NULL,'2021',0,true,'{"pattern":"^(19|20)\\d{2}$"}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'year_founded',true,4,NULL),
  (NULL,'description','Brief description','At least 50 characters.',NULL,5,true,'{"minLength":50,"maxLength":2000}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'description',true,5,NULL),
  (NULL,'logo_url','Startup logo',NULL,NULL,90,false,'{"bucket":"logos","maxSizeMB":5,"accept":{"image/*":[".png",".jpg",".jpeg",".webp"]}}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'logo_url',true,6,NULL),
  -- location is collected at registration and prefills the draft; hidden here
  -- (with its now-empty heading). See 20260619_dedupe_registration_fields.sql.
  (NULL,'h_location','Location',NULL,NULL,30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,false,7,NULL),
  (NULL,'location','Headquarters',NULL,NULL,91,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,false,8,NULL),
  (NULL,'h_category','Category',NULL,NULL,30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,9,NULL),
  -- primary_sector + stage are collected at registration; hidden here, still
  -- routed via prefill. See 20260619_dedupe_registration_fields.sql.
  (NULL,'primary_sector','Primary sector',NULL,'Pick a sector',6,false,'{}'::jsonb,NULL,'SECTORS',false,NULL,NULL,NULL,'primary_sector',false,10,NULL),
  (NULL,'secondary_sector','Secondary sector',NULL,NULL,0,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'secondary_sector',true,11,NULL),
  (NULL,'business_model','Business model',NULL,'Select…',6,false,'{}'::jsonb,NULL,'BUSINESS_MODELS',false,NULL,NULL,NULL,'business_model',true,12,NULL),
  (NULL,'stage','Current stage',NULL,'Pick a stage',6,false,'{}'::jsonb,NULL,'STAGES',false,NULL,NULL,NULL,'stage',false,13,NULL),
  (NULL,'revenue_models','Revenue model',NULL,NULL,7,false,'{}'::jsonb,NULL,'REVENUE_MODELS',false,NULL,NULL,NULL,'revenue_models',true,14,NULL),
  (NULL,'h_team','Team & Legal',NULL,NULL,30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,15,NULL),
  (NULL,'total_employees','Total employees',NULL,NULL,4,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'total_employees',true,16,NULL),
  (NULL,'female_employees','Female employees',NULL,NULL,4,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'female_employees',true,17,NULL),
  (NULL,'founding_team_composition','Founding team composition',NULL,'Select…',6,false,'{}'::jsonb,NULL,'FOUNDING_TEAM_COMPOSITIONS',false,NULL,NULL,NULL,'founding_team_composition',true,18,NULL),
  (NULL,'fbr_registered','FBR registration',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'fbr_registered',true,19,NULL),
  (NULL,'secp_registered','SECP registration',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'secp_registered',true,20,NULL),
  (NULL,'is_pasha_member','P@SHA membership',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'is_pasha_member',true,21,NULL),
  (NULL,'h_traction','Traction & Funding',NULL,NULL,30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,22,NULL),
  (NULL,'revenue_band','Current revenue',NULL,'Select…',6,false,'{}'::jsonb,NULL,'REVENUE_BANDS',false,NULL,NULL,NULL,'revenue_band',true,23,NULL),
  (NULL,'raised_funding','Raised funding',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'raised_funding',true,24,NULL),
  (NULL,'funding_stage','Funding stage',NULL,'Select…',6,false,'{}'::jsonb,NULL,'FUNDING_STAGES',false,NULL,NULL,NULL,'funding_stage',true,25,'{"field_key":"raised_funding","equals":true}'::jsonb),
  (NULL,'currently_raising','Currently raising',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'currently_raising',true,26,NULL),
  (NULL,'pitch_deck_url','Pitch deck',NULL,NULL,90,false,'{"bucket":"pitch-decks","maxSizeMB":4,"accept":{"application/pdf":[".pdf"]}}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'pitch_deck_url',true,27,NULL),
  (NULL,'pitch_video','Pitch video',NULL,'https://',2,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'pitch_video',true,28,NULL),
  (NULL,'h_incubation','Incubation',NULL,NULL,30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,29,NULL),
  (NULL,'incubated_in_nic','Incubation status',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'incubated_in_nic',true,30,NULL),
  (NULL,'nic_name','Incubation center',NULL,'Select…',6,false,'{}'::jsonb,NULL,'NIC_CENTERS',false,NULL,NULL,NULL,'nic_name',true,31,'{"field_key":"incubated_in_nic","equals":true}'::jsonb),
  (NULL,'nic_cohort','Cohort',NULL,NULL,0,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'nic_cohort',true,32,'{"field_key":"incubated_in_nic","equals":true}'::jsonb),
  (NULL,'nic_year','Incubation year',NULL,NULL,4,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'nic_year',true,33,'{"field_key":"incubated_in_nic","equals":true}'::jsonb),
  (NULL,'h_socials','Socials',NULL,NULL,30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,34,NULL),
  (NULL,'company_linkedin','Company LinkedIn',NULL,'https://',2,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'company_linkedin',true,35,NULL),
  (NULL,'company_x','Company X / Twitter',NULL,'https://',2,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'company_x',true,36,NULL),
  (NULL,'company_instagram','Company Instagram',NULL,'https://',2,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'company_instagram',true,37,NULL),
  (NULL,'company_facebook','Company Facebook',NULL,'https://',2,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'company_facebook',true,38,NULL),
  (NULL,'company_youtube','Company YouTube',NULL,'https://',2,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'company_youtube',true,39,NULL)
) AS x(parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
WHERE s.key = 'startup';

-- ===== Step 2: Founders (repeatable group) =====
INSERT INTO form_fields
  (section_id, parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
SELECT s.id, x.parent_field_id, x.field_key, x.label, x.hint, x.placeholder, x.input_type, x.required, x.validation, x.options, x.options_source, x.repeatable, x.min_items, x.max_items, x.item_label, x.column_map, x.visible, x.sort_order, x.conditional
FROM form_sections s
CROSS JOIN (VALUES
  (NULL::uuid,'founders','Founders',NULL::text,NULL::text,20,false,'{}'::jsonb,NULL::jsonb,NULL::text,true,1,NULL::int,'Founder','founders',true,0,NULL::jsonb)
) AS x(parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
WHERE s.key = 'founders';

-- ===== Step 3: Recognition =====
INSERT INTO form_fields
  (section_id, parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
SELECT s.id, x.parent_field_id, x.field_key, x.label, x.hint, x.placeholder, x.input_type, x.required, x.validation, x.options, x.options_source, x.repeatable, x.min_items, x.max_items, x.item_label, x.column_map, x.visible, x.sort_order, x.conditional
FROM form_sections s
CROSS JOIN (VALUES
  (NULL::uuid,'h_ip','Intellectual property',NULL::text,NULL::text,30,false,'{}'::jsonb,NULL::jsonb,NULL::text,false,NULL::int,NULL::int,NULL::text,NULL::text,true,0,NULL::jsonb),
  (NULL,'has_patents','Patents or trademarks',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'has_patents',true,1,NULL),
  (NULL,'patents_count','Patent count',NULL,NULL,4,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'patents_count',true,2,'{"field_key":"has_patents","equals":true}'::jsonb),
  (NULL,'h_awards','Awards & Certifications',NULL,NULL,30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,3,NULL),
  (NULL,'awards','Awards & recognition',NULL,NULL,5,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'awards',true,4,NULL),
  (NULL,'certifications','Certifications',NULL,NULL,5,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'certifications',true,5,NULL),
  (NULL,'h_engagement','Engagement',NULL,NULL,30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,6,NULL),
  (NULL,'engagement_interests','Engagement interests',NULL,NULL,7,false,'{}'::jsonb,NULL,'ENGAGEMENT_INTERESTS',false,NULL,NULL,NULL,'engagement_interests',true,7,NULL),
  (NULL,'h_community','Community',NULL,NULL,30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,8,NULL),
  (NULL,'whatsapp_optin','WhatsApp community',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'whatsapp_optin',true,9,NULL),
  (NULL,'facebook_optin','Facebook community',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'facebook_optin',true,10,NULL),
  (NULL,'h_closing','Closing',NULL,NULL,30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,11,NULL),
  (NULL,'closing_notes','Closing notes',NULL,NULL,5,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'closing_notes',true,12,NULL)
) AS x(parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
WHERE s.key = 'recognition';

COMMIT;

-- Sanity check (optional): should return 3 sections and 53 fields.
-- SELECT (SELECT count(*) FROM form_sections) AS sections,
--        (SELECT count(*) FROM form_fields) AS fields;
