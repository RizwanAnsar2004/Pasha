import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getApplicantUser } from "@/lib/auth/applicant/applicant-auth";

// Server-side resumable draft for the signed-in applicant. One row per user

export async function GET() {
  const user = await getApplicantUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("application_drafts")
    .select("data, current_step, submitted_at, submission_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: data?.data ?? {},
    current_step: data?.current_step ?? 0,
    submitted: Boolean(data?.submitted_at),
    submission_id: data?.submission_id ?? null,
  });
}

export async function PUT(req: Request) {
  const user = await getApplicantUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: { data?: Record<string, unknown>; current_step?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Don't let autosave overwrite an already-submitted application.
  const { data: existing } = await supabase
    .from("application_drafts")
    .select("submitted_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing?.submitted_at) {
    return NextResponse.json({ error: "Application already submitted" }, { status: 409 });
  }

  const { error } = await supabase.from("application_drafts").upsert(
    {
      user_id: user.id,
      email: user.email ?? null,
      data: body.data ?? {},
      current_step: Number.isFinite(body.current_step) ? body.current_step : 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
