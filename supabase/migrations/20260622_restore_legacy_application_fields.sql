-- Re-add legacy ApplyForm fields to the 7-step application form so they are
-- collected on submit, routed to their existing submissions columns (via
-- column_map), and visible in the admin submission drawer alongside the new
-- spec fields (which continue to land in answers JSONB when unmapped).
--
-- Idempotent: deletes these field_keys from the application form first, then
-- re-inserts them in logical sections.

BEGIN;

DELETE FROM form_fields
WHERE field_key IN (
  'revenue_models',
  'founding_team_composition',
  'fbr_registered',
  'secp_registered',
  'is_pasha_member',
  'raised_funding',
  'funding_stage',
  'pitch_video',
  'incubated_in_nic',
  'nic_name',
  'nic_cohort',
  'nic_year',
  'has_patents',
  'patents_count',
  'certifications',
  'engagement_interests',
  'whatsapp_optin',
  'facebook_optin',
  'closing_notes',
  'h_team_legal',
  'h_revenue_model',
  'h_legacy_funding',
  'h_incubation',
  'h_ip',
  'h_certifications',
  'h_engagement',
  'h_community',
  'h_closing'
)
AND section_id IN (
  SELECT id FROM form_sections
  WHERE form_key = 'application' OR form_key IS NULL
);

-- Step 1 — Startup: revenue model
INSERT INTO form_fields
  (section_id, parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
SELECT s.id, x.parent_field_id, x.field_key, x.label, x.hint, x.placeholder, x.input_type, x.required, x.validation, x.options, x.options_source, x.repeatable, x.min_items, x.max_items, x.item_label, x.column_map, x.visible, x.sort_order, x.conditional
FROM form_sections s
CROSS JOIN (VALUES
  (NULL::uuid,'h_revenue_model','Revenue model',NULL::text,NULL::text,30,false,'{}'::jsonb,NULL::jsonb,NULL::text,false,NULL::int,NULL::int,NULL::text,NULL::text,true,25,NULL::jsonb),
  (NULL,'revenue_models','Revenue model',NULL,NULL,7,false,'{}'::jsonb,NULL,'REVENUE_MODELS',false,NULL,NULL,NULL,'revenue_models',true,26,NULL)
) AS x(parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
WHERE s.key = 'identity' AND (s.form_key = 'application' OR s.form_key IS NULL);

-- Step 2 — Founders & team: legal / P@SHA toggles
INSERT INTO form_fields
  (section_id, parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
SELECT s.id, x.parent_field_id, x.field_key, x.label, x.hint, x.placeholder, x.input_type, x.required, x.validation, x.options, x.options_source, x.repeatable, x.min_items, x.max_items, x.item_label, x.column_map, x.visible, x.sort_order, x.conditional
FROM form_sections s
CROSS JOIN (VALUES
  (NULL::uuid,'h_team_legal','Team & legal',NULL::text,NULL::text,30,false,'{}'::jsonb,NULL::jsonb,NULL::text,false,NULL::int,NULL::int,NULL::text,NULL::text,true,6,NULL::jsonb),
  (NULL,'founding_team_composition','Founding team composition',NULL,'Select…',6,false,'{}'::jsonb,NULL,'FOUNDING_TEAM_COMPOSITIONS',false,NULL,NULL,NULL,'founding_team_composition',true,7,NULL),
  (NULL,'fbr_registered','FBR registration',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'fbr_registered',true,8,NULL),
  (NULL,'secp_registered','SECP registration',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'secp_registered',true,9,NULL),
  (NULL,'is_pasha_member','P@SHA membership',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'is_pasha_member',true,10,NULL)
) AS x(parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
WHERE s.key = 'founders' AND (s.form_key = 'application' OR s.form_key IS NULL);

-- Step 5 — Traction: legacy funding toggles + certifications
INSERT INTO form_fields
  (section_id, parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
SELECT s.id, x.parent_field_id, x.field_key, x.label, x.hint, x.placeholder, x.input_type, x.required, x.validation, x.options, x.options_source, x.repeatable, x.min_items, x.max_items, x.item_label, x.column_map, x.visible, x.sort_order, x.conditional
FROM form_sections s
CROSS JOIN (VALUES
  (NULL::uuid,'h_legacy_funding','Funding (legacy)',NULL::text,'Optional — kept for committee records alongside the funding status fields above.'::text,30,false,'{}'::jsonb,NULL::jsonb,NULL::text,false,NULL::int,NULL::int,NULL::text,NULL::text,true,17,NULL::jsonb),
  (NULL,'raised_funding','Raised funding?',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'raised_funding',true,18,NULL),
  (NULL,'funding_stage','Funding stage',NULL,'Select…',6,false,'{}'::jsonb,NULL,'FUNDING_STAGES',false,NULL,NULL,NULL,'funding_stage',true,19,'{"field_key":"raised_funding","equals":true}'::jsonb),
  (NULL,'h_certifications','Certifications',NULL,NULL,30,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,NULL,true,20,NULL),
  (NULL,'certifications','Certifications','ISO, SOC 2, sector-specific certs.',NULL,5,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'certifications',true,21,NULL)
) AS x(parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
WHERE s.key = 'traction' AND (s.form_key = 'application' OR s.form_key IS NULL);

-- Step 6 — Operations: incubation, IP, engagement, community, closing
INSERT INTO form_fields
  (section_id, parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
SELECT s.id, x.parent_field_id, x.field_key, x.label, x.hint, x.placeholder, x.input_type, x.required, x.validation, x.options, x.options_source, x.repeatable, x.min_items, x.max_items, x.item_label, x.column_map, x.visible, x.sort_order, x.conditional
FROM form_sections s
CROSS JOIN (VALUES
  (NULL::uuid,'h_incubation','Incubation',NULL::text,NULL::text,30,false,'{}'::jsonb,NULL::jsonb,NULL::text,false,NULL::int,NULL::int,NULL::text,NULL::text,true,15,NULL::jsonb),
  (NULL,'incubated_in_nic','Incubated in a NIC?',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'incubated_in_nic',true,16,NULL),
  (NULL,'nic_name','Incubation center',NULL,'Select…',6,false,'{}'::jsonb,NULL,'NIC_CENTERS',false,NULL,NULL,NULL,'nic_name',true,17,'{"field_key":"incubated_in_nic","equals":true}'::jsonb),
  (NULL,'nic_cohort','Cohort',NULL,'e.g. Cohort 12',0,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'nic_cohort',true,18,'{"field_key":"incubated_in_nic","equals":true}'::jsonb),
  (NULL,'nic_year','Incubation year',NULL,NULL,4,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'nic_year',true,19,'{"field_key":"incubated_in_nic","equals":true}'::jsonb),
  (NULL::uuid,'h_ip','Intellectual property',NULL::text,NULL::text,30,false,'{}'::jsonb,NULL::jsonb,NULL::text,false,NULL::int,NULL::int,NULL::text,NULL::text,true,20,NULL::jsonb),
  (NULL,'has_patents','Patents or trademarks?',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'has_patents',true,21,NULL),
  (NULL,'patents_count','Patent count',NULL,NULL,4,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'patents_count',true,22,'{"field_key":"has_patents","equals":true}'::jsonb),
  (NULL::uuid,'h_engagement','Engagement',NULL::text,'What opportunities are you open to?'::text,30,false,'{}'::jsonb,NULL::jsonb,NULL::text,false,NULL::int,NULL::int,NULL::text,NULL::text,true,23,NULL::jsonb),
  (NULL,'engagement_interests','Engagement interests',NULL,NULL,7,false,'{}'::jsonb,NULL,'ENGAGEMENT_INTERESTS',false,NULL,NULL,NULL,'engagement_interests',true,24,NULL),
  (NULL::uuid,'h_community','Community',NULL::text,NULL::text,30,false,'{}'::jsonb,NULL::jsonb,NULL::text,false,NULL::int,NULL::int,NULL::text,NULL::text,true,25,NULL::jsonb),
  (NULL,'whatsapp_optin','Join PSEC WhatsApp community',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'whatsapp_optin',true,26,NULL),
  (NULL,'facebook_optin','Join PSEC Facebook community',NULL,NULL,8,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'facebook_optin',true,27,NULL),
  (NULL::uuid,'h_closing','Anything else',NULL::text,NULL::text,30,false,'{}'::jsonb,NULL::jsonb,NULL::text,false,NULL::int,NULL::int,NULL::text,NULL::text,true,28,NULL::jsonb),
  (NULL,'closing_notes','Closing notes','Optional context for the committee.',NULL,5,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'closing_notes',true,29,NULL)
) AS x(parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
WHERE s.key = 'operations' AND (s.form_key = 'application' OR s.form_key IS NULL);

-- Step 7 — Documents: pitch video
INSERT INTO form_fields
  (section_id, parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
SELECT s.id, x.parent_field_id, x.field_key, x.label, x.hint, x.placeholder, x.input_type, x.required, x.validation, x.options, x.options_source, x.repeatable, x.min_items, x.max_items, x.item_label, x.column_map, x.visible, x.sort_order, x.conditional
FROM form_sections s
CROSS JOIN (VALUES
  (NULL,'pitch_video','Pitch video URL',NULL,'https://',2,false,'{}'::jsonb,NULL,NULL,false,NULL,NULL,NULL,'pitch_video',true,9,NULL)
) AS x(parent_field_id, field_key, label, hint, placeholder, input_type, required, validation, options, options_source, repeatable, min_items, max_items, item_label, column_map, visible, sort_order, conditional)
WHERE s.key = 'documents' AND (s.form_key = 'application' OR s.form_key IS NULL);

COMMIT;
