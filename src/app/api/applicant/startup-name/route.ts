import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getApplicantUser } from "@/lib/auth/applicant/applicant-auth";
import {
  MIN_NAME_LENGTH,
  findDuplicateStartupName,
  normaliseStartupName,
} from "@/lib/startups/duplicate-name.server";

// Availability check for the startup name field, called while the applicant
// types.
//
// The duplicate rule already ran at submit, but only there — an applicant
// filled all six steps before being told the name was taken, and the only way
// forward was to change it and resubmit. This answers the same question
// immediately, using the exact same matcher, so the two can never disagree.
//
// Signed in only: it reads whether a company is already listed, which is not
// something an anonymous caller should be able to enumerate.
export async function GET(req: Request) {
  const user = await getApplicantUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const name = new URL(req.url).searchParams.get("name") ?? "";
  // Answer "available" rather than erroring on a short or empty name: the field
  // is mid-edit, not wrong, and an error here would render under the input
  // while someone is still typing the first characters.
  if (normaliseStartupName(name).length < MIN_NAME_LENGTH) {
    return NextResponse.json({ taken: false });
  }

  const existing = await findDuplicateStartupName(createServiceClient(), name, user.id);

  return NextResponse.json(
    existing ? { taken: true, existing } : { taken: false },
    // Never cached. A name can be claimed between two keystrokes, and a stale
    // "available" is the answer that costs someone a rejected submission.
    { headers: { "Cache-Control": "no-store" } }
  );
}
