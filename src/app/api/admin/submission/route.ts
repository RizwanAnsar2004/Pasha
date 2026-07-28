// Admin-only endpoint for moderating submissions.

import { NextResponse, after } from "next/server";
import { createClient as createSessionClient, createServiceClient } from "@/lib/supabase/server";
import { sendTemplate, firstNameOf } from "@/lib/email/mailer";
import { z } from "zod";
import { isAdminEmail } from "@/lib/auth/admin/admin-allowlist";
import { getFeaturedStatusByDatabankId } from "@/lib/startups/directory/featured-startups.server";
import { getFieldLabelMap } from "@/lib/forms/form-config.server";
import { emailOrigin } from "@/lib/utils/site-url";
import { notifyRagDatabank } from "@/lib/ai/rag-sync";
import { publishSubmissionToDatabank } from "@/lib/startups/databank/publish.server";
import { CACHE_NS, withCache, withInvalidate } from "@/lib/cache/index.server";

const updateSchema = z.object({
  id: z.string().uuid(),
  // Spec §12 vocabulary; legacy 'pending'/'watchlist' tolerated for old rows.
  status: z.enum(["submitted", "needs_update", "approved", "rejected", "pending", "watchlist"]),
  reviewer_notes: z.string().max(2000).optional(),
});

// "Verify" toggles the PASHA verified badge on the published databank row (spec §12 — Verified state).
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

async function getHandler(req: Request) {
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

  const field_labels = await getFieldLabelMap("application");

  return NextResponse.json({ submission, databank_id, featured, field_labels, verified });
}

async function patchHandler(req: Request) {
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

    // Re-ingest this startup so the badge change reflects in the RAG store.
    notifyRagDatabank("UPDATE", databankId);

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
    .select("status, reviewer_notes, vetting_tier, user_id, startup_name, founder_name, founder_email")
    .eq("id", id)
    .single();

  if (!priorRow) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  // Only overwrite the stored note when the reviewer actually wrote one.
  const patch: Record<string, unknown> = {
    status,
    reviewer_id: user.id,
    reviewed_at: new Date().toISOString(),
  };
  if (reviewer_notes !== undefined) {
    patch.reviewer_notes = reviewer_notes;
  }

  const { error: updErr } = await supabase
    .from("submissions")
    .update(patch)
    .eq("id", id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // 3a. On "Needs Update", reopen the applicant's draft so they can edit and resubmit (clears submitted_at; the submission row is updated in place on.
  if (status === "needs_update" && priorRow.user_id) {
    const { error: reopenErr } = await supabase
      .from("application_drafts")
      .update({ submitted_at: null })
      .eq("user_id", priorRow.user_id);
    if (reopenErr) console.error("reopen draft failed:", reopenErr.message);
  }

  // 3b. On approval, materialise the submission into the public databank table
  // so it appears on /directory. Shared with the applicant partial-edit resync.
  if (status === "approved") {
    await publishSubmissionToDatabank(supabase, id);
  }

  // 4. Write audit entry.
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
        reviewer_notes !== undefined &&
        (priorRow.reviewer_notes ?? "") !== reviewer_notes,
    },
  });
  if (auditErr) {
    console.error("audit_log insert failed:", auditErr.message);
  }

  // 5. Best-effort applicant notification on a real status change.
  const STATUS_TEMPLATES: Record<string, string> = {
    approved: "submission_approved",
    rejected: "submission_rejected",
    needs_update: "submission_needs_update",
    watchlist: "submission_watchlist",
  };
  const templateId = STATUS_TEMPLATES[status];
  if (templateId && status !== priorRow.status) {
    after(async () => {
      // Prefer the founder contact; fall back to the owning account's profile email.
      let email = priorRow.founder_email ?? null;
      if (!email && priorRow.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", priorRow.user_id)
          .maybeSingle<{ email: string | null }>();
        email = profile?.email ?? null;
      }
      if (!email) return;

      await sendTemplate({
        templateId,
        recipients: [
          {
            email,
            userId: priorRow.user_id ?? null,
            values: {
              "{{first_name}}": firstNameOf(priorRow.founder_name),
              "{{startup_name}}": priorRow.startup_name ?? "your startup",
              "{{reviewer_notes}}": reviewer_notes ?? "",
              "{{link}}": `${emailOrigin()}/apply`,
            },
          },
        ],
        context: { trigger: templateId, submission_id: id },
      });
    });
  }

  return NextResponse.json({ ok: true, id, status });
}

// --- Redis cache wiring: read-through on GET, namespace invalidation on writes. ---
export const GET = withCache(CACHE_NS.submission, getHandler, { guard: requireAdmin });
export const PATCH = withInvalidate(CACHE_NS.submission, patchHandler);
