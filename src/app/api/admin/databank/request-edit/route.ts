// Admin-only: ask a databank startup to fill/correct specific fields or
// sections. Records an edit_requests row (which re-opens exactly those fields
// in the applicant portal) and emails the startup a link to complete it.

import { NextResponse, after } from "next/server";
import { z } from "zod";
import { createClient as createSessionClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin/admin-allowlist";
import { getFormConfig } from "@/lib/forms/form-config.server";
import { resolveFieldKeys, summarizeScope, type EditRequestScope } from "@/lib/startups/edit-requests/edit-requests";
import { upsertEditRequest } from "@/lib/startups/edit-requests/edit-requests.server";
import { sendTemplate, firstNameOf } from "@/lib/email/mailer";
import { emailOrigin } from "@/lib/utils/site-url";

const bodySchema = z
  .object({
    databankId: z.string().uuid(),
    wholeForm: z.boolean().optional().default(false),
    sectionKeys: z.array(z.string()).optional().default([]),
    fieldKeys: z.array(z.string()).optional().default([]),
    note: z.string().max(2000).optional(),
    dueAt: z.string().datetime().optional(),
  })
  .refine((b) => b.wholeForm || b.sectionKeys.length > 0 || b.fieldKeys.length > 0, {
    message: "Pick at least one field, section, or the whole form",
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

export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { databankId, wholeForm, sectionKeys, fieldKeys, note, dueAt } = parsed.data;

  const supabase = createServiceClient();

  // Resolve the databank row -> its submission -> the owning applicant account.
  const { data: row } = await supabase
    .from("databank")
    .select("id, source_id, startup_name, contact_email, contact_person")
    .eq("id", databankId)
    .maybeSingle<{
      id: string;
      source_id: string | null;
      startup_name: string | null;
      contact_email: string | null;
      contact_person: string | null;
    }>();
  if (!row) return NextResponse.json({ error: "Startup not found" }, { status: 404 });

  const submissionId: string | null = row.source_id;
  let ownerId: string | null = null;
  let founderEmail: string | null = null;
  let founderName: string | null = null;
  let startupName = row.startup_name;

  if (submissionId) {
    const { data: sub } = await supabase
      .from("submissions")
      .select("id, user_id, founder_email, founder_name, startup_name")
      .eq("id", submissionId)
      .maybeSingle<{
        id: string;
        user_id: string | null;
        founder_email: string | null;
        founder_name: string | null;
        startup_name: string | null;
      }>();
    if (sub) {
      ownerId = sub.user_id;
      founderEmail = sub.founder_email;
      founderName = sub.founder_name;
      startupName = sub.startup_name ?? startupName;
    }
  }

  // Without a linked applicant account there is nobody to unlock the form for.
  if (!ownerId) {
    return NextResponse.json(
      { error: "This startup has no linked applicant account, so its form can't be reopened for editing." },
      { status: 409 }
    );
  }

  const config = await getFormConfig("application");
  if (!config) return NextResponse.json({ error: "Application form is not configured" }, { status: 500 });

  const scope: EditRequestScope = { wholeForm, sectionKeys, fieldKeys };
  const resolvedFieldKeys = resolveFieldKeys(config, scope);
  if (!wholeForm && resolvedFieldKeys.length === 0) {
    return NextResponse.json({ error: "None of the selected fields exist in the form" }, { status: 400 });
  }

  const created = await upsertEditRequest({
    submissionId,
    databankId,
    userId: ownerId,
    scope,
    resolvedFieldKeys,
    note: note?.trim() || null,
    dueAt: dueAt ?? null,
    requestedBy: user.id,
    requestedByEmail: user.email ?? null,
  });
  if (!created) {
    return NextResponse.json({ error: "Could not save the edit request" }, { status: 500 });
  }

  // Audit trail.
  const { error: auditErr } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_email: user.email,
    action: "databank.request_edit",
    resource_type: "databank",
    resource_id: databankId,
    payload: { edit_request_id: created.id, whole_form: wholeForm, section_keys: sectionKeys, field_keys: resolvedFieldKeys },
  });
  if (auditErr) console.error("audit_log insert failed:", auditErr.message);

  // Notify the startup (best-effort, non-blocking).
  const requestedItems = summarizeScope(config, scope);
  after(async () => {
    let email = founderEmail;
    if (!email && ownerId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", ownerId)
        .maybeSingle<{ email: string | null }>();
      email = profile?.email ?? null;
    }
    if (!email) email = row.contact_email;
    if (!email) return;

    await sendTemplate({
      templateId: "databank_edit_request",
      recipients: [
        {
          email,
          userId: ownerId,
          values: {
            "{{first_name}}": firstNameOf(founderName ?? row.contact_person),
            "{{startup_name}}": startupName ?? "your startup",
            "{{note}}": note?.trim() || "",
            "{{requested_items}}": requestedItems,
            "{{link}}": `${emailOrigin()}/apply`,
          },
        },
      ],
      context: { trigger: "databank_edit_request", databank_id: databankId, edit_request_id: created.id },
    });
  });

  return NextResponse.json({ ok: true, id: created.id, requestedItems });
}
