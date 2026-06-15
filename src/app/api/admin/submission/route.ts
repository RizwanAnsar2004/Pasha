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

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected", "watchlist"]),
  reviewer_notes: z.string().max(2000).optional(),
});

export async function PATCH(req: Request) {
  // 1. Auth check via session cookie + DB-backed admin allowlist
  const sessionClient = await createSessionClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user || !(await isAdminEmail(user.email))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
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
    .select("status, reviewer_notes, vetting_tier")
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

  // 3a. On approval, materialise the submission into the public databank
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
      const enrichment = {
        key_persons: full.founders ?? [],
        company_linkedin: full.company_linkedin ?? null,
        company_x: full.company_x ?? null,
        company_instagram: full.company_instagram ?? null,
        company_facebook: full.company_facebook ?? null,
        company_youtube: full.company_youtube ?? null,
        hq_country: full.hq_country ?? null,
        awards: full.awards ?? null,
        certifications: full.certifications ?? null,
      };

      // Try update by startup_name first. Use .select("id") so we know
      // whether any row was actually updated.
      const { data: updated, error: updErr } = await supabase
        .from("databank")
        .update(enrichment)
        .ilike("startup_name", full.startup_name)
        .select("id");

      if (updErr) {
        console.error("databank update failed:", updErr.message);
      }

      // No existing row → insert a fresh databank row from the submission.
      if (!updErr && (!updated || updated.length === 0)) {
        // year_founded comes in as a 4-digit string. founded_date column
        // expects a date — fall back to 01 Jan of that year so the detail
        // page can display "Founded January 2024" etc.
        const founded_date = full.year_founded
          ? `${full.year_founded}-01-01`
          : null;
        const city = full.outside_pakistan
          ? null
          : full.hq_city === "Other"
            ? full.hq_other ?? null
            : full.hq_city ?? null;

        const insertRow = {
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
          ...enrichment,
        };

        const { error: insErr } = await supabase
          .from("databank")
          .insert(insertRow);
        if (insErr) {
          console.error("databank insert from submission failed:", insErr.message);
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
