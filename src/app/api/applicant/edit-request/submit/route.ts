// Applicant endpoint: submit the fields an admin unlocked via an edit request.
// Bypasses the normal "already submitted" lock, but ONLY for the allow-listed
// fields — writes them to the submission + draft, resyncs the public databank
// row, and closes the request.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { getApplicantUser } from "@/lib/auth/applicant/applicant-auth";
import { getFormConfig } from "@/lib/forms/form-config.server";
import {
  buildZodSchema,
  routeValues,
  CITY_COMPOSITE_KEYS,
  type FormConfig,
} from "@/lib/forms/form-config";
import { InputType } from "@/lib/forms/form-enums";
import { allFieldKeys, filterConfigToKeys } from "@/lib/startups/edit-requests/edit-requests";
import { markEditRequestSubmitted } from "@/lib/startups/edit-requests/edit-requests.server";
import { publishSubmissionToDatabank, touchDatabank } from "@/lib/startups/databank/publish.server";
import { runRules } from "@/lib/forms/form-design";

const bodySchema = z.object({
  editRequestId: z.string().uuid(),
  data: z.record(z.string(), z.unknown()),
});

const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

// The raw form values (keyed by field_key) to merge back into the draft — mirrors
// routeValues' iteration so composites and "Other" text come along.
function pickDraftValues(reduced: FormConfig, data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const section of reduced) {
    for (const field of section.fields) {
      if (field.input_type === InputType.HEADING) continue;
      if (field.input_type === InputType.CITY_COMPOSITE) {
        for (const k of CITY_COMPOSITE_KEYS) out[k] = data[k];
        continue;
      }
      out[field.field_key] = data[field.field_key];
      const otherKey = `${field.field_key}_other`;
      if (otherKey in data) out[otherKey] = data[otherKey];
    }
  }
  return out;
}

// Update a row, dropping columns the DB doesn't have yet (expand/migrate/contract).
async function updateWithHeal(
  supabase: ReturnType<typeof createServiceClient>,
  table: string,
  match: Record<string, unknown>,
  patch: Record<string, unknown>
): Promise<{ error: { message: string } | null }> {
  const rec = { ...patch };
  let query = supabase.from(table).update(rec);
  for (const [k, v] of Object.entries(match)) query = query.eq(k, v);
  let { error } = await query;
  let safety = Object.keys(rec).length + 2;
  while (error && safety-- > 0) {
    const m = error.message.match(/column "([^"]+)"/) ?? error.message.match(/the '([^']+)' column/);
    const col = m?.[1];
    if (!col || !(col in rec)) break;
    delete rec[col];
    let retry = supabase.from(table).update(rec);
    for (const [k, v] of Object.entries(match)) retry = retry.eq(k, v);
    ({ error } = await retry);
  }
  return { error };
}

export async function POST(req: Request) {
  const user = await getApplicantUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const { editRequestId, data } = parsed.data;

  const supabase = createServiceClient();

  // Load + authorize the edit request.
  const { data: reqRow } = await supabase
    .from("edit_requests")
    .select("id, user_id, status, whole_form, field_keys, submission_id")
    .eq("id", editRequestId)
    .maybeSingle<{
      id: string;
      user_id: string | null;
      status: string;
      whole_form: boolean | null;
      field_keys: unknown;
      submission_id: string | null;
    }>();
  if (!reqRow || reqRow.user_id !== user.id) {
    return NextResponse.json({ error: "Edit request not found" }, { status: 404 });
  }
  if (reqRow.status !== "pending") {
    return NextResponse.json({ error: "This request has already been submitted." }, { status: 409 });
  }

  const config = await getFormConfig("application");
  if (!config) return NextResponse.json({ error: "Application form is not configured" }, { status: 500 });

  const wholeForm = Boolean(reqRow.whole_form);
  const allowedKeys = wholeForm ? allFieldKeys(config) : asStrings(reqRow.field_keys);
  const reduced = wholeForm ? config : filterConfigToKeys(config, allowedKeys);

  // Validate only the unlocked fields — required unlocked fields must be filled.
  const schema = buildZodSchema(reduced);
  const check = schema.safeParse(data);
  if (!check.success) {
    return NextResponse.json(
      { error: "Please complete the requested fields.", details: check.error.flatten() },
      { status: 400 }
    );
  }
  const clean = check.data as Record<string, unknown>;

  const { columns, answers } = routeValues(reduced, clean);

  // 1. Write the unlocked values onto the submission (merge into answers bag).
  if (reqRow.submission_id) {
    const { data: cur } = await supabase
      .from("submissions")
      .select("answers")
      .eq("id", reqRow.submission_id)
      .maybeSingle<{ answers: Record<string, unknown> | null }>();
    const mergedAnswers = { ...(cur?.answers ?? {}), ...answers };
    // Cross-field rules, checked against the merge rather than the submitted
    // values: an edit request can unlock a single market-size field, so an
    // inversion is only visible alongside the figures already stored. The
    // reduced schema above cannot see them, so this runs the rules separately.
    // Blocks before the write, so a valid listing can't be edited into an
    // impossible one.
    const ruleIssue = runRules({ ...mergedAnswers, ...columns })[0];
    if (ruleIssue) {
      return NextResponse.json({ error: ruleIssue.message }, { status: 400 });
    }
    const { error: subErr } = await updateWithHeal(
      supabase,
      "submissions",
      { id: reqRow.submission_id },
      { ...columns, answers: mergedAnswers }
    );
    if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 });
  }

  // 2. Keep the applicant's draft in sync so the portal shows the new values.
  const { data: draftRow } = await supabase
    .from("application_drafts")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle<{ data: Record<string, unknown> | null }>();
  const mergedData = { ...(draftRow?.data ?? {}), ...pickDraftValues(reduced, clean) };
  await supabase
    .from("application_drafts")
    .update({ data: mergedData, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  // 3. Resync the public databank row from the updated submission, and flag it
  //    as updated so admins notice the startup responded.
  if (reqRow.submission_id) {
    const { databankId } = await publishSubmissionToDatabank(supabase, reqRow.submission_id);
    if (databankId) await touchDatabank(supabase, databankId, { data_status: "updated" });
  }

  // 4. Close the request and audit.
  await markEditRequestSubmitted(reqRow.id);
  const { error: auditErr } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_email: user.email ?? null,
    action: "edit_request.submitted",
    resource_type: "edit_request",
    resource_id: reqRow.id,
    payload: { fields: [...Object.keys(columns), ...Object.keys(answers)] },
  });
  if (auditErr) console.error("audit_log insert failed:", auditErr.message);

  return NextResponse.json({ ok: true });
}
