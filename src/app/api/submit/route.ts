import { NextResponse, after } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendTemplate, firstNameOf } from "@/lib/email/mailer";
import { submissionSchema, OTHER_TEXT_FIELDS, type Founder } from "@/lib/forms/schema";
import { scoreVetting } from "@/lib/startups/vetting/vetting";
import { getFormConfig } from "@/lib/forms/form-config.server";
import { buildFieldLabelMap, buildZodSchema, resolveFieldLabel, routeValues } from "@/lib/forms/form-config";
import { getApplicantUser } from "@/lib/auth/applicant/applicant-auth";
import { computeCompletion, fieldLabelMap } from "@/lib/forms/profile-completion";
import { emailOrigin } from "@/lib/utils/site-url";
import { getFormOptionRegistry } from "@/lib/options/registry.server";
import { getOptionIndex } from "@/lib/options/index.server";
import { resolveOptionValue } from "@/lib/options/resolve";
import { CACHE_NS, withInvalidate } from "@/lib/cache/index.server";

async function postHandler(req: Request) {
  try {
    // The apply form lives behind the applicant auth wall — an application is always tied to the signed-in user who created it.
    const user = await getApplicantUser();
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to submit your application." },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // The form structure may be admin-defined; loading the registry also teaches the schema which ids mean "Other".
    const [config, , optionIndex] = await Promise.all([
      getFormConfig(),
      getFormOptionRegistry(),
      getOptionIndex(),
    ]);
    const labelMap = config ? buildFieldLabelMap(config) : {};
    let cols: Record<string, unknown>;
    let answers: Record<string, unknown> = {};
    // Field-key-keyed values (before column routing) — what the §12 completion engine reads.
    let formData: Record<string, unknown>;

    if (config && config.length > 0) {
      const parsed = buildZodSchema(config).safeParse(body);
      if (!parsed.success) return validationError(parsed.error.issues, labelMap);
      formData = parsed.data as Record<string, unknown>;
      const routed = routeValues(config, formData);
      cols = routed.columns;
      answers = routed.answers;
    } else {
      const parsed = submissionSchema.safeParse(body);
      if (!parsed.success) return validationError(parsed.error.issues, labelMap);
      cols = parsed.data as unknown as Record<string, unknown>;
      formData = cols;
      // The `${field}_other` free text has no column of its own, so lift it out
      for (const key of OTHER_TEXT_FIELDS) {
        const otherKey = `${key}_other`;
        const text = cols[otherKey];
        if (typeof text === "string" && text.trim()) answers[otherKey] = text.trim();
        delete cols[otherKey];
      }
    }

    // Submission is gated solely by the schema validation above — which is built from each field's admin `required` flag (buildZodSchema).
    const completion = computeCompletion(
      formData,
      config && config.length > 0 ? fieldLabelMap(config) : undefined
    );

    // Helper: read a column value, coercing undefined → null for the insert.
    const col = (k: string) => (cols[k] === undefined ? null : cols[k]);
    const founders = (cols.founders as Founder[] | undefined) ?? [];

    // Primary founder populates the legacy flat founder_* columns so existing admin tooling keeps working.
    const primary = founders.find((f) => f.is_primary) ?? founders[0];
    const totalFoundersDerived = founders.length || undefined;

    // founder_gender rejects option ids — normalise before counting or writing.
    const genderOf = (f: Founder) => resolveOptionValue(optionIndex, f.gender ?? null);
    const femaleFoundersDerived =
      founders.filter((f) => genderOf(f) === "female").length || undefined;

    // Vetting — reads core columns + primary founder.
    const vetting = scoreVetting({
      startup_name: cols.startup_name as string | undefined,
      website: cols.website as string | undefined,
      founder_name: primary?.name,
      founder_email: primary?.email,
      description: cols.description as string | undefined,
      stage: cols.stage as string | undefined,
      revenue_band: cols.revenue_band as string | undefined,
      raised_funding: cols.raised_funding as boolean | undefined,
      funding_stage: cols.funding_stage as string | undefined,
      total_founders: totalFoundersDerived,
      total_employees: cols.total_employees as number | undefined,
      female_founders: femaleFoundersDerived,
      fbr_registered: cols.fbr_registered as boolean | undefined,
      secp_registered: cols.secp_registered as boolean | undefined,
      incubated_in_nic: cols.incubated_in_nic as boolean | undefined,
      nic_name: cols.nic_name as string | undefined,
      has_patents: cols.has_patents as boolean | undefined,
      primary_sector: cols.primary_sector as string | undefined,
    });

    const headers = req.headers;
    const ip =
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headers.get("x-real-ip") ??
      null;
    const ua = headers.get("user-agent") ?? null;

    const supabase = createServiceClient();

    // Columns that may not exist if a migration hasn't been applied yet.
    const V2_COLUMNS = [
      "founders",
      "company_linkedin",
      "company_x",
      "company_instagram",
      "company_facebook",
      "company_youtube",
      "hq_country",
      "outside_pakistan",
      "awards",
      "certifications",
      "founder_role",
      "tagline",
      "answers",
      "user_id",
      "completion_score",
    ] as const;

    const record: Record<string, unknown> = {
      // ---- legacy flat columns (kept for admin tooling backward compat)
      founder_name: primary?.name ?? null,
      founder_email: primary?.email ?? null,
      founder_mobile: primary?.mobile ?? null,
      founder_linkedin: primary?.linkedin ?? null,
      founder_photo_url: primary?.photo_url ?? null,
      founder_gender: primary ? genderOf(primary) : null,
      founder_role: primary?.role ?? null,

      // ---- startup
      startup_name: col("startup_name"),
      tagline: col("tagline"),
      website: col("website"),
      year_founded: (cols.year_founded as string) || null,
      description: col("description"),
      logo_url: col("logo_url"),

      // ---- location
      hq_city: col("hq_city"),
      hq_other: col("hq_other"),
      outside_pakistan: cols.outside_pakistan ?? false,
      hq_country: col("hq_country"),

      // ---- category
      primary_sector: col("primary_sector"),
      secondary_sector: col("secondary_sector"),
      business_model: col("business_model"),
      stage: col("stage"),
      revenue_models: (cols.revenue_models as string[]) ?? [],

      // ---- team & legal
      total_employees: col("total_employees"),
      female_employees: col("female_employees"),
      founding_team_composition: col("founding_team_composition"),
      fbr_registered: col("fbr_registered"),
      secp_registered: col("secp_registered"),
      is_pasha_member: col("is_pasha_member"),

      // ---- traction & funding
      revenue_band: col("revenue_band"),
      raised_funding: col("raised_funding"),
      funding_stage: col("funding_stage"),
      currently_raising: col("currently_raising"),
      pitch_deck_url: col("pitch_deck_url"),
      pitch_video: col("pitch_video"),

      // ---- incubation
      incubated_in_nic: col("incubated_in_nic"),
      nic_name: col("nic_name"),
      nic_cohort: col("nic_cohort"),
      nic_year: col("nic_year"),

      // ---- socials
      company_linkedin: col("company_linkedin"),
      company_x: col("company_x"),
      company_instagram: col("company_instagram"),
      company_facebook: col("company_facebook"),
      company_youtube: col("company_youtube"),

      // ---- founders array (source of truth — JSONB) + derived counts
      // Normalised so women-led detection never resolves an id out of JSONB.
      founders: founders.map((f) => (f.gender ? { ...f, gender: genderOf(f) ?? f.gender } : f)),
      total_founders: totalFoundersDerived ?? null,
      female_founders: femaleFoundersDerived ?? null,

      // ---- recognition
      has_patents: col("has_patents"),
      patents_count: col("patents_count"),
      awards: col("awards"),
      certifications: col("certifications"),
      engagement_interests: (cols.engagement_interests as string[]) ?? [],
      whatsapp_optin: cols.whatsapp_optin ?? false,
      facebook_optin: cols.facebook_optin ?? false,
      closing_notes: col("closing_notes"),

      // ---- admin-defined fields (no column_map) live here
      answers,

      // ---- owning applicant
      user_id: user.id,

      // ---- computed + audit
      vetting_score: vetting.score,
      vetting_tier: vetting.tier,
      completion_score: completion.percent,
      source_ip: ip,
      user_agent: ua,
    };

    // Resubmission: if this applicant already has a submission (e.g.
    const { data: existingDraft } = await supabase
      .from("application_drafts")
      .select("submission_id")
      .eq("user_id", user.id)
      .maybeSingle<{ submission_id: string | null }>();
    const existingSubmissionId = existingDraft?.submission_id ?? null;

    record.status = "submitted";
    if (existingSubmissionId) {
      record.reviewed_at = null;
    }

    async function persist(rec: Record<string, unknown>) {
      const cols = "id, vetting_score, vetting_tier";
      if (existingSubmissionId) {
        return supabase
          .from("submissions")
          .update(rec)
          .eq("id", existingSubmissionId)
          .select(cols)
          .single();
      }
      return supabase.from("submissions").insert(rec).select(cols).single();
    }

    let { data: row, error } = await persist(record);

    // Strip missing columns and retry (bounded).
    let safetyLoops = V2_COLUMNS.length + 4;
    while (error && safetyLoops-- > 0) {
      const pg = error.message.match(/column "([^"]+)" of relation/);
      const rest = error.message.match(/the '([^']+)' column of '/);
      const colName = pg?.[1] ?? rest?.[1];
      if (!colName || !(colName in record)) break;
      delete record[colName];
      ({ data: row, error } = await persist(record));
    }

    if (error || !row) {
      return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
    }

    // Finalise the applicant's draft: link it to the new submission and stamp it so the apply page shows the submitted state instead of the wizard.
    await supabase
      .from("application_drafts")
      .update({ submission_id: row.id, submitted_at: new Date().toISOString() })
      .eq("user_id", user.id);

    // Best-effort confirmation email, sent after the response.
    const recipientEmail = (user.email ?? primary?.email ?? "").toString();
    if (recipientEmail) {
      after(() =>
        sendTemplate({
          templateId: "submission_received",
          recipients: [
            {
              email: recipientEmail,
              userId: user.id,
              values: {
                "{{first_name}}": firstNameOf(primary?.name),
                "{{startup_name}}": String(cols.startup_name ?? "your startup"),
                "{{link}}": `${emailOrigin()}/apply`,
              },
            },
          ],
          context: { trigger: "submission_received", submission_id: row.id },
        })
      );
    }

    return NextResponse.json({
      ok: true,
      id: row.id,
      tier: row.vetting_tier,
      score: row.vetting_score,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Submit failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Shared field-level validation error response.
function validationError(
  issues: { path: PropertyKey[]; message: string }[],
  labelMap: Record<string, string>
) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const pathKey = issue.path.length > 0 ? issue.path.join(".") : "_root";
    fieldErrors[pathKey] = `${resolveFieldLabel(labelMap, pathKey)}: ${issue.message}`;
  }
  const firstField = Object.keys(fieldErrors)[0];
  const summary = firstField ? fieldErrors[firstField] : "Validation failed";
  return NextResponse.json({ error: summary, fieldErrors }, { status: 400 });
}

// --- Redis cache wiring: read-through on GET, namespace invalidation on writes. ---
export const POST = withInvalidate(CACHE_NS.submission, postHandler);
