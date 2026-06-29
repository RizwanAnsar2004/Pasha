// Admin-only endpoint for toggling P@SHA-verified flag on a databank row.
//
// Mirrors the pattern in /api/admin/submission:
//   - Session cookie must belong to an admin email (allowlist by domain).
//   - Single update + audit_log insert (audit failure does not roll back the
//     update — we log to server console and keep going).

import { NextResponse } from "next/server";
import { createClient as createSessionClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import { isAdminEmail } from "@/lib/admin-allowlist";
import { notifyRagDatabank } from "@/lib/rag-sync";

const patchSchema = z.object({
  id: z.string().uuid(),
  verified: z.boolean(),
});

export async function PATCH(req: Request) {
  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user || !(await isAdminEmail(user.email))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { id, verified } = parsed.data;

  const supabase = createServiceClient();

  const { data: prior } = await supabase
    .from("databank")
    .select("pasha_verified")
    .eq("id", id)
    .single();

  if (!prior) {
    return NextResponse.json({ error: "Startup not found" }, { status: 404 });
  }

  const { error: updErr } = await supabase
    .from("databank")
    .update({
      pasha_verified: verified,
      pasha_verified_at: verified ? new Date().toISOString() : null,
      pasha_verified_by: verified ? user.email : null,
    })
    .eq("id", id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  const { error: auditErr } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_email: user.email,
    action: verified ? "databank.verify" : "databank.unverify",
    resource_type: "databank",
    resource_id: id,
    payload: { prior: prior.pasha_verified === true, next: verified },
  });
  if (auditErr) {
    console.error("audit_log insert failed:", auditErr.message);
  }

  // Re-ingest this startup so the verified badge reflects in the RAG store.
  notifyRagDatabank("UPDATE", id);

  return NextResponse.json({ ok: true, id, verified });
}
