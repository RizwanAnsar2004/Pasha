import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { submissionSchema } from "@/lib/schema";
import { scoreVetting } from "@/lib/vetting";
import { labelFor } from "@/lib/field-labels";

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    const parsed = submissionSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const pathKey = issue.path.length > 0 ? issue.path.join(".") : "_root";
        const label = labelFor(pathKey);
        fieldErrors[pathKey] = `${label}: ${issue.message}`;
      }
      const firstField = Object.keys(fieldErrors)[0];
      const summary = firstField ? fieldErrors[firstField] : "Validation failed";
      return NextResponse.json({ error: summary, fieldErrors }, { status: 400 });
    }
    const data = parsed.data;

    // Primary founder is the row marked is_primary (the schema's superRefine
    // sets the first row to primary if none was marked). Used to populate the
    // legacy flat founder_* columns so existing admin tooling keeps working.
    const primary = data.founders.find((f) => f.is_primary) ?? data.founders[0];
    // Derive total + female founder counts from the array; the form no
    // longer asks for them separately.
    const totalFoundersDerived = data.founders.length || undefined;
    const femaleFoundersDerived =
      data.founders.filter((f) => f.gender === "female").length || undefined;

    // Vetting — reads from primary founder + startup fields.
    const vetting = scoreVetting({
      startup_name: data.startup_name,
      website: data.website,
      founder_name: primary?.name,
      founder_email: primary?.email,
      description: data.description,
      stage: data.stage as
        | "ideation"
        | "dev_launch"
        | "early"
        | "growth"
        | undefined,
      revenue_band: data.revenue_band,
      raised_funding: data.raised_funding,
      funding_stage: data.funding_stage,
      total_founders: totalFoundersDerived,
      total_employees: data.total_employees,
      female_founders: femaleFoundersDerived,
      fbr_registered: data.fbr_registered,
      secp_registered: data.secp_registered,
      incubated_in_nic: data.incubated_in_nic,
      nic_name: data.nic_name,
      has_patents: data.has_patents,
      primary_sector: data.primary_sector,
    });

    const headers = req.headers;
    const ip =
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headers.get("x-real-ip") ??
      null;
    const ua = headers.get("user-agent") ?? null;

    const supabase = createServiceClient();

    // Build the full v2 record. If the v2 migration hasn't been applied yet,
    // Postgres will error on the unknown column names — we then strip those
    // and retry with the legacy column set so the form keeps accepting
    // submissions through the deploy/migration handoff window.
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
        startup_name: data.startup_name,
        tagline: data.tagline ?? null,
        website: data.website,
        year_founded: data.year_founded || null,
        description: data.description,
        logo_url: data.logo_url ?? null,

        // ---- location
        hq_city: data.hq_city ?? null,
        hq_other: data.hq_other ?? null,
        outside_pakistan: data.outside_pakistan,
        hq_country: data.hq_country ?? null,

        // ---- category
        primary_sector: data.primary_sector,
        secondary_sector: data.secondary_sector ?? null,
        business_model: data.business_model ?? null,
        stage: data.stage,
        revenue_models: data.revenue_models ?? [],

        // ---- team & legal
        total_employees: data.total_employees ?? null,
        female_employees: data.female_employees ?? null,
        founding_team_composition: data.founding_team_composition ?? null,
        fbr_registered: data.fbr_registered ?? null,
        secp_registered: data.secp_registered ?? null,
        is_pasha_member: data.is_pasha_member ?? null,

        // ---- traction & funding
        revenue_band: data.revenue_band ?? null,
        raised_funding: data.raised_funding ?? null,
        funding_stage: data.funding_stage ?? null,
        currently_raising: data.currently_raising ?? null,
        pitch_deck_url: data.pitch_deck_url ?? null,
        pitch_video: data.pitch_video ?? null,

        // ---- incubation
        incubated_in_nic: data.incubated_in_nic ?? null,
        nic_name: data.nic_name ?? null,
        nic_cohort: data.nic_cohort ?? null,
        nic_year: data.nic_year ?? null,

        // ---- socials
        company_linkedin: data.company_linkedin ?? null,
        company_x: data.company_x ?? null,
        company_instagram: data.company_instagram ?? null,
        company_facebook: data.company_facebook ?? null,
        company_youtube: data.company_youtube ?? null,

        // ---- founders array (NEW source of truth — JSONB).
        // total_founders / female_founders columns are populated from
        // derived counts so legacy admin tooling that reads them keeps
        // working. The form no longer asks for these as separate inputs.
        founders: data.founders,
        total_founders: totalFoundersDerived ?? null,
        female_founders: femaleFoundersDerived ?? null,

        // ---- recognition
        has_patents: data.has_patents ?? null,
        patents_count: data.patents_count ?? null,
        awards: data.awards ?? null,
        certifications: data.certifications ?? null,
        engagement_interests: data.engagement_interests ?? [],
        whatsapp_optin: data.whatsapp_optin,
        facebook_optin: data.facebook_optin,
        closing_notes: data.closing_notes ?? null,

        // ---- computed + audit
        vetting_score: vetting.score,
        vetting_tier: vetting.tier,
        source_ip: ip,
        user_agent: ua,
    };

    async function insertWith(rec: Record<string, unknown>) {
      return supabase
        .from("submissions")
        .insert(rec)
        .select("id, vetting_score, vetting_tier")
        .single();
    }

    let { data: row, error } = await insertWith(record);

    // If the v2 migration isn't fully applied (or a v2 column was added on
    // databank but missed on submissions), Postgres/PostgREST reports the
    // missing column — we strip just that column and retry. Bounded loop
    // because each retry can surface one more missing column.
    //
    // Two error shapes to handle:
    //   PG direct:  `column "X" of relation "submissions" does not exist`
    //   PostgREST:  `Could not find the 'X' column of 'submissions' in the schema cache`
    let safetyLoops = V2_COLUMNS.length + 4;
    while (error && safetyLoops-- > 0) {
      const pg = error.message.match(/column "([^"]+)" of relation/);
      const rest = error.message.match(/the '([^']+)' column of '/);
      const col = pg?.[1] ?? rest?.[1];
      if (!col || !(col in record)) break;
      delete record[col];
      ({ data: row, error } = await insertWith(record));
    }

    if (error || !row) {
      return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
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
