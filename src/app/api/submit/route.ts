import { NextResponse, after } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendTemplate, firstNameOf } from "@/lib/mailer";
import { submissionSchema, type Founder } from "@/lib/schema";
import { scoreVetting } from "@/lib/vetting";
import { getFormConfig } from "@/lib/form-config.server";
import { buildFieldLabelMap, buildZodSchema, resolveFieldLabel, routeValues } from "@/lib/form-config";
import { getApplicantUser } from "@/lib/applicant-auth";
import { computeCompletion, fieldLabelMap } from "@/lib/profile-completion";
import { requestOrigin } from "@/lib/site-url";

export async function POST(req: Request) {
  try {
    // The apply form lives behind the applicant auth wall — an application is
    // always tied to the signed-in user who created it.
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

    // The form structure may be admin-defined. When a config exists we validate
    // against the schema built from it and route values to their mapped columns
    // (+ an `answers` JSONB bag for admin-added fields). Without a config we use
    // the original static schema — values are already keyed by column name.
    const config = await getFormConfig();
    const labelMap = config ? buildFieldLabelMap(config) : {};
    let cols: Record<string, unknown>;
    let answers: Record<string, unknown> = {};
    // Field-key-keyed values (before column routing) — what the §12 completion
    // engine reads.
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
    }

    // Submission is gated solely by the schema validation above — which is built
    // from each field's admin `required` flag (buildZodSchema). A field the admin
    // left optional never blocks submission, keeping the * markers, per-step
    // Continue, and this gate in agreement. The §12 completion ladder below is
    // computed only for the progress score / dashboard tiers — it does NOT gate.
    const completion = computeCompletion(
      formData,
      config && config.length > 0 ? fieldLabelMap(config) : undefined
    );

    // Helper: read a column value, coercing undefined → null for the insert.
    const col = (k: string) => (cols[k] === undefined ? null : cols[k]);
    const founders = (cols.founders as Founder[] | undefined) ?? [];

    // Primary founder populates the legacy flat founder_* columns so existing
    // admin tooling keeps working.
    const primary = founders.find((f) => f.is_primary) ?? founders[0];
    const totalFoundersDerived = founders.length || undefined;
    const femaleFoundersDerived =
      founders.filter((f) => f.gender === "female").length || undefined;

    // Vetting — reads core columns + primary founder.
    const vetting = scoreVetting({
      startup_name: cols.startup_name as string | undefined,
      website: cols.website as string | undefined,
      founder_name: primary?.name,
      founder_email: primary?.email,
      description: cols.description as string | undefined,
      stage: cols.stage as
        | "ideation"
        | "dev_launch"
        | "early"
        | "growth"
        | undefined,
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

    // Columns that may not exist if a migration hasn't been applied yet. On a
    // "column X does not exist" error we strip X and retry (deploy/migration
    // handoff window). `answers` is here for the form-builder migration too.
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
      founder_gender: primary?.gender ?? null,
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
      founders: founders,
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

    // Resubmission: if this applicant already has a submission (e.g. after a
    // "Needs Update"), update that row in place and move it back to
    // "submitted" — don't create a duplicate. First-time submitters insert.
    const { data: existingDraft } = await supabase
      .from("application_drafts")
      .select("submission_id")
      .eq("user_id", user.id)
      .maybeSingle<{ submission_id: string | null }>();
    const existingSubmissionId = existingDraft?.submission_id ?? null;

    if (existingSubmissionId) {
      record.status = "submitted";
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

    // Strip missing columns and retry (bounded). Two error shapes:
    //   PG direct:  `column "X" of relation "submissions" does not exist`
    //   PostgREST:  `Could not find the 'X' column of 'submissions' in the schema cache`
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

    // Finalise the applicant's draft: link it to the new submission and stamp
    // it so the apply page shows the submitted state instead of the wizard.
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
                "{{link}}": `${requestOrigin(req)}/apply`,
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
