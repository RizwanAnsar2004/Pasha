import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { getFormConfig } from "@/lib/forms/form-config.server";
import { buildOutline, type EditRequestScope, type OutlineSection } from "./edit-requests";

// The pending unlock in force for an applicant right now (or null).
export type ActiveEditRequest = {
  id: string;
  whole_form: boolean;
  section_keys: string[];
  field_keys: string[]; // resolved allow-list the portal gates on
  note: string | null;
  due_at: string | null;
  submission_id: string | null;
};

const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

// The single open (pending) edit request for an applicant, or null. Safe before
// the migration is applied — a missing table just resolves to null.
export async function getActiveEditRequest(userId: string): Promise<ActiveEditRequest | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("edit_requests")
    .select("id, whole_form, section_keys, field_keys, note, due_at, submission_id")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      whole_form: boolean | null;
      section_keys: unknown;
      field_keys: unknown;
      note: string | null;
      due_at: string | null;
      submission_id: string | null;
    }>();
  if (error || !data) return null;
  return {
    id: data.id,
    whole_form: Boolean(data.whole_form),
    section_keys: asStrings(data.section_keys),
    field_keys: asStrings(data.field_keys),
    note: data.note,
    due_at: data.due_at,
    submission_id: data.submission_id,
  };
}

// The admin picker outline (steps -> sections -> fields) for the application form.
export async function getEditRequestOutline(): Promise<OutlineSection[]> {
  const config = await getFormConfig("application");
  return config ? buildOutline(config) : [];
}

// Create a pending edit request, or merge into the applicant's existing open one
// (the DB enforces one open request per user). Returns the row id.
export async function upsertEditRequest(params: {
  submissionId: string | null;
  databankId: string | null;
  userId: string;
  scope: EditRequestScope;
  resolvedFieldKeys: string[];
  note: string | null;
  dueAt: string | null;
  requestedBy: string | null;
  requestedByEmail: string | null;
}): Promise<{ id: string } | null> {
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();

  const { data: existing } = await supabase
    .from("edit_requests")
    .select("id, whole_form, section_keys, field_keys")
    .eq("user_id", params.userId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle<{ id: string; whole_form: boolean | null; section_keys: unknown; field_keys: unknown }>();

  if (existing) {
    // Merge the new scope into the open request rather than creating a second one.
    const merged = {
      whole_form: Boolean(existing.whole_form) || params.scope.wholeForm,
      section_keys: Array.from(new Set([...asStrings(existing.section_keys), ...params.scope.sectionKeys])),
      field_keys: Array.from(new Set([...asStrings(existing.field_keys), ...params.resolvedFieldKeys])),
      note: params.note,
      due_at: params.dueAt,
      requested_by: params.requestedBy,
      requested_by_email: params.requestedByEmail,
      updated_at: nowIso,
    };
    const { error } = await supabase.from("edit_requests").update(merged).eq("id", existing.id);
    if (error) return null;
    return { id: existing.id };
  }

  const { data, error } = await supabase
    .from("edit_requests")
    .insert({
      submission_id: params.submissionId,
      databank_id: params.databankId,
      user_id: params.userId,
      whole_form: params.scope.wholeForm,
      section_keys: params.scope.sectionKeys,
      field_keys: params.resolvedFieldKeys,
      note: params.note,
      due_at: params.dueAt,
      status: "pending",
      requested_by: params.requestedBy,
      requested_by_email: params.requestedByEmail,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return null;
  return { id: data.id };
}

// Close a request once the applicant has resubmitted the unlocked fields.
export async function markEditRequestSubmitted(id: string): Promise<void> {
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();
  await supabase
    .from("edit_requests")
    .update({ status: "submitted", submitted_at: nowIso, updated_at: nowIso })
    .eq("id", id);
}
