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
    blurb: "With the P@SHA committee for review. Not listed until approved.",
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
    blurb: "Listed publicly with the P@SHA verified badge.",
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
  if (!input.submitted) return "draft";
  const status = (input.status ?? "submitted").toLowerCase();

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
