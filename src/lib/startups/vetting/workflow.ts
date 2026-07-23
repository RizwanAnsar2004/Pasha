// Submission workflow stages (spec §12 "Profile submission workflow").

export type WorkflowStage =
  | "draft"
  | "submitted"
  | "needs_update"
  | "approved"
  | "verified"
  | "featured"
  | "rejected";

export type StageMeta = {
  label: string;
  // Public-visibility note from the spec.
  blurb: string;
  // Drives badge styling at the call site.
  tone: "neutral" | "info" | "warn" | "success" | "danger" | "gold";
};

export const STAGE_META: Record<WorkflowStage, StageMeta> = {
  draft: {
    label: "Draft",
    blurb: "Not listed publicly. Complete your profile and submit for review.",
    tone: "neutral",
  },
  submitted: {
    label: "Submitted",
    blurb: "With the PASHA committee for review. Not listed until approved.",
    tone: "info",
  },
  needs_update: {
    label: "Needs Update",
    blurb: "The committee asked for changes. Fix the notes below and resubmit.",
    tone: "warn",
  },
  approved: {
    label: "Approved",
    blurb: "Published — your profile is live on the public directory.",
    tone: "success",
  },
  verified: {
    label: "Verified",
    blurb: "Listed publicly with the PASHA verified badge.",
    tone: "success",
  },
  featured: {
    label: "Featured",
    blurb: "Highlighted on the homepage and featured directory section.",
    tone: "gold",
  },
  rejected: {
    label: "Not accepted",
    blurb: "This submission wasn't accepted. See the committee's notes below.",
    tone: "danger",
  },
};

// Derive the workflow stage. `status` is the raw `submissions.status`
export function deriveStage(input: {
  submitted: boolean;
  status?: string | null;
  pashaVerified?: boolean;
  featuredActive?: boolean;
}): WorkflowStage {
  const status = (input.status ?? "submitted").toLowerCase();

  // "Needs Update" hands the application back to the applicant by clearing
  // submitted_at — but the stage must survive that, or they'd see a plain
  // "Draft" card with the committee's notes hidden and no resubmit CTA.
  //
  // Rejection is deliberately NOT treated the same way. Reapplying also clears
  // submitted_at while leaving status "rejected", and keying off the submission
  // row there left the stage pinned to "rejected" so the Reapply button never
  // unmounted. An unsubmitted rejection is a fresh editable draft.
  if (!input.submitted) return status === "needs_update" ? "needs_update" : "draft";

  if (status === "rejected") return "rejected";
  if (status === "needs_update") return "needs_update";

  if (status === "approved") {
    if (input.featuredActive) return "featured";
    if (input.pashaVerified) return "verified";
    return "approved";
  }

  // submitted / pending / watchlist / anything else → awaiting review.
  return "submitted";
}

export function stageMeta(stage: WorkflowStage): StageMeta {
  return STAGE_META[stage];
}
