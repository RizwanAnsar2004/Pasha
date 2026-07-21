import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getApplicantUser } from "@/lib/auth/applicant/applicant-auth";

// Reopen the applicant's draft for editing after a rejection so they can update
export async function POST() {
  const user = await getApplicantUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: draft } = await supabase
    .from("application_drafts")
    .select("submitted_at, submission_id")
    .eq("user_id", user.id)
    .maybeSingle<{ submitted_at: string | null; submission_id: string | null }>();

  if (!draft?.submission_id) {
    return NextResponse.json({ error: "No submission to reopen" }, { status: 404 });
  }

  const { data: sub } = await supabase
    .from("submissions")
    .select("status")
    .eq("id", draft.submission_id)
    .maybeSingle<{ status: string | null }>();

  if (sub?.status !== "rejected") {
    return NextResponse.json(
      { error: "Only rejected applications can be reopened" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("application_drafts")
    .update({ submitted_at: null })
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
