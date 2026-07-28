import "server-only";
import type { createServiceClient } from "@/lib/supabase/server";

type ServiceClient = ReturnType<typeof createServiceClient>;

// Append a row to audit_log. Best-effort: a failure is logged, never thrown, so
// it can't break the action that triggered it. Use for the full startup
// lifecycle (submit -> approve -> databank -> verify -> featured -> award ->
// request-edit) so every flow is in one filterable trail.
export async function writeAudit(
  supabase: ServiceClient,
  e: {
    actorId?: string | null;
    actorEmail?: string | null;
    action: string;
    resourceType?: string | null;
    resourceId?: string | null;
    payload?: Record<string, unknown> | null;
  }
): Promise<void> {
  const { error } = await supabase.from("audit_log").insert({
    actor_id: e.actorId ?? null,
    actor_email: e.actorEmail ?? null,
    action: e.action,
    resource_type: e.resourceType ?? null,
    resource_id: e.resourceId ?? null,
    payload: e.payload ?? null,
  });
  if (error) console.error(`audit_log insert failed (${e.action}):`, error.message);
}
