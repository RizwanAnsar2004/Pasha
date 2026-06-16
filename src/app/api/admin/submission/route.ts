// Admin-only endpoint for moderating submissions.
// Requires:
// - Authenticated session (Supabase cookie)
// - Email in the admin allowlist (server-side check via is_admin() RLS predicate)
//
// Writes the status change + an audit_log entry in a single transaction.

import { NextResponse } from "next/server";
import { createClient as createSessionClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import { isAdminEmail } from "@/lib/admin-allowlist";
import { getFeaturedStatusByDatabankId } from "@/lib/featured-startups.server";

const updateSchema = z.object({
  id: z.string().uuid(),
  // Spec §12 vocabulary; legacy 'pending'/'watchlist' tolerated for old rows.
  status: z.enum(["submitted", "needs_update", "approved", "rejected", "pending", "watchlist"]),
  reviewer_notes: z.string().max(2000).optional(),
});

// "Verify" toggles the P@SHA verified badge on the published databank row
// (spec §12 — Verified state). Separate from the review status.
const verifySchema = z.object({
  id: z.string().uuid(),
  action: z.literal("verify"),
  verified: z.boolean(),
});

async function requireAdmin() {
  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user || !(await isAdminEmail(user.email))) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user, error: null };
}

async function resolveDatabankId(
  supabase: ReturnType<typeof createServiceClient>,
  submissionId: string,
  startupName: string | null
) {
  const { data: bySource } = await supabase
    .from("databank")
    .select("id")
    .eq("source_id", submissionId)
    .maybeSingle();
  if (bySource?.id) return bySource.id as string;

  if (!startupName) return null;

  const { data: byName } = await supabase
    .from("databank")
    .select("id")
    .ilike("startup_name", startupName)
    .limit(1)
    .maybeSingle();
  return (byName?.id as string | undefined) ?? null;
}

export async function GET(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: submission, error: subErr } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", id)
    .single();

  if (subErr || !submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  let databank_id: string | null = null;
  let featured = null;
  let verified = false;

  if (submission.status === "approved") {
    databank_id = await resolveDatabankId(
      supabase,
      id,
      submission.startup_name as string | null
    );
    if (databank_id) {
      featured = await getFeaturedStatusByDatabankId(databank_id);
      const { data: dbRow } = await supabase
        .from("databank")
        .select("pasha_verified")
        .eq("id", databank_id)
        .maybeSingle<{ pasha_verified: boolean | null }>();
      verified = Boolean(dbRow?.pasha_verified);
    }
  }

  return NextResponse.json({ submission, databank_id, featured, verified });
}

export async function PATCH(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── Verify toggle (operates on the published databank row) ────────────────
  if ((body as { action?: string })?.action === "verify") {
    const v = verifySchema.safeParse(body);
    if (!v.success) {
      return NextResponse.json({ error: "Validation failed", details: v.error.flatten() }, { status: 400 });
    }
    const supabase = createServiceClient();
    const { data: sub } = await supabase
      .from("submissions")
      .select("startup_name, status")
      .eq("id", v.data.id)
      .maybeSingle<{ startup_name: string | null; status: string | null }>();
    if (!sub) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    if (sub.status !== "approved") {
      return NextResponse.json({ error: "Approve the startup before verifying it." }, { status: 400 });
    }
    const databankId = await resolveDatabankId(supabase, v.data.id, sub.startup_name);
    if (!databankId) {
      return NextResponse.json({ error: "No published directory row found to verify." }, { status: 404 });
    }
    const { error: vErr } = await supabase
      .from("databank")
      .update({
        pasha_verified: v.data.verified,
        pasha_verified_at: v.data.verified ? new Date().toISOString() : null,
        pasha_verified_by: v.data.verified ? user.email ?? user.id : null,
      })
      .eq("id", databankId);
    if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });

    await supabase.from("audit_log").insert({
      actor_id: user.id,
      actor_email: user.email,
      action: v.data.verified ? "submission.verify" : "submission.unverify",
      resource_type: "submission",
      resource_id: v.data.id,
      payload: { databank_id: databankId, verified: v.data.verified },
    });
    return NextResponse.json({ ok: true, id: v.data.id, verified: v.data.verified });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { id, status, reviewer_notes } = parsed.data;

  // 3. Apply update + write audit log via service-role client (bypasses RLS)
  const supabase = createServiceClient();

  // Capture prior state for the audit log
  const { data: priorRow } = await supabase
    .from("submissions")
    .select("status, reviewer_notes, vetting_tier, user_id")
    .eq("id", id)
    .single();

  if (!priorRow) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const { error: updErr } = await supabase
    .from("submissions")
    .update({
      status,
      reviewer_notes: reviewer_notes ?? null,
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // 3a. On "Needs Update", reopen the applicant's draft so they can edit and
  // resubmit (clears submitted_at; the submission row is updated in place on
  // resubmit). The reviewer_notes above carry the committee's comments.
  if (status === "needs_update" && priorRow.user_id) {
    const { error: reopenErr } = await supabase
      .from("application_drafts")
      .update({ submitted_at: null })
      .eq("user_id", priorRow.user_id);
    if (reopenErr) console.error("reopen draft failed:", reopenErr.message);
  }

  // 3b. On approval, materialise the submission into the public databank
  // table so it appears on /directory.
  //
  // Two cases:
  //   (a) A databank row already exists for this startup (matched by
  //       case-insensitive name). Update the enrichment fields in place.
  //   (b) No matching databank row — create a new one with all the
  //       directory-visible columns populated from the submission. This
  //       is what was missing: previously approval was a no-op for any
  //       startup that hadn't been scraped from StartupConnect.
  if (status === "approved") {
    const { data: full } = await supabase
      .from("submissions")
      .select(
        "id, startup_name, tagline, website, year_founded, description, logo_url, hq_city, hq_other, outside_pakistan, hq_country, primary_sector, secondary_sector, business_model, total_employees, female_employees, nic_name, founders, company_linkedin, company_x, company_instagram, company_facebook, company_youtube, awards, certifications, founder_name, founder_email"
      )
      .eq("id", id)
      .maybeSingle();

    if (full?.startup_name) {
      const founded_date = full.year_founded ? `${full.year_founded}-01-01` : null;
      const city = full.outside_pakistan
        ? null
        : full.hq_city === "Other"
          ? full.hq_other ?? null
          : full.hq_city ?? null;

      const databankRow = {
        source: "submission",
        source_id: full.id,
        source_status: "Approved",
        startup_name: full.startup_name,
        company_name: full.startup_name,
        tagline: full.tagline ?? null,
        website: full.website ?? null,
        founded_date,
        primary_industry: full.primary_sector ?? null,
        secondary_industries: full.secondary_sector ?? null,
        business_types: full.business_model ?? null,
        city,
        nic_name: full.nic_name ?? null,
        contact_person: full.founder_name ?? null,
        contact_email: full.founder_email ?? null,
        total_employees: full.total_employees ?? null,
        female_employees: full.female_employees ?? null,
        logo_url: full.logo_url ?? null,
        startup_idea: full.description ?? null,
        key_persons: full.founders ?? [],
        company_linkedin: full.company_linkedin ?? null,
        company_x: full.company_x ?? null,
        company_instagram: full.company_instagram ?? null,
        company_facebook: full.company_facebook ?? null,
        company_youtube: full.company_youtube ?? null,
        hq_country: full.hq_country ?? null,
        awards: full.awards ?? null,
        certifications: full.certifications ?? null,
        updated_at: new Date().toISOString(),
      };

      const { data: bySource } = await supabase
        .from("databank")
        .select("id")
        .eq("source_id", full.id)
        .maybeSingle();

      if (bySource?.id) {
        const { error: updErr } = await supabase
          .from("databank")
          .update(databankRow)
          .eq("id", bySource.id);
        if (updErr) console.error("databank update by source_id failed:", updErr.message);
      } else {
        const { data: updated, error: updErr } = await supabase
          .from("databank")
          .update(databankRow)
          .ilike("startup_name", full.startup_name)
          .select("id");

        if (updErr) {
          console.error("databank update failed:", updErr.message);
        } else if (!updated || updated.length === 0) {
          const { error: insErr } = await supabase.from("databank").insert(databankRow);
          if (insErr) {
            console.error("databank insert from submission failed:", insErr.message);
          }
        }
      }
    }
  }

  // 4. Write audit entry. Don't fail the request if audit insert fails — log it.
  const { error: auditErr } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_email: user.email,
    action: `submission.${status}`,
    resource_type: "submission",
    resource_id: id,
    payload: {
      prior_status: priorRow.status,
      new_status: status,
      reviewer_notes_changed:
        (priorRow.reviewer_notes ?? "") !== (reviewer_notes ?? ""),
    },
  });
  if (auditErr) {
    console.error("audit_log insert failed:", auditErr.message);
  }

  return NextResponse.json({ ok: true, id, status });
}
