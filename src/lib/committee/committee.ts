export type CommitteeActivityType =
  | "verification"
  | "report"
  | "program"
  | "event"
  | "update"
  | "initiative";

export type CommitteeActivityRow = {
  id: string;
  title: string;
  type: CommitteeActivityType;
  description: string;
  status: string;
  author_email: string | null;
  created_at: string;
};

export type CommitteeMemberType = "chairman" | "member" | "admin";

export const COMMITTEE_MEMBER_TYPES: { value: CommitteeMemberType; label: string }[] = [
  { value: "chairman", label: "Chairman" },
  { value: "member", label: "Committee Member" },
  { value: "admin", label: "Admin" },
];

export function committeeMemberTypeLabel(type: CommitteeMemberType) {
  return COMMITTEE_MEMBER_TYPES.find((t) => t.value === type)?.label ?? type;
}

// Public /committee card — sourced from admin_users (committee management).
export type CommitteeMemberRow = {
  email: string;
  name: string;
  role: string;
  org: string;
  type: CommitteeMemberType;
  added_at: string;
  // Optional headshot set in Admin → Committee Management. Null falls back to
  // the initials avatar.
  photo_url: string | null;
};

export const COMMITTEE_MEMBER_TAG = "Committee Member";
export const COMMITTEE_CHAIR_TAG = "PASHA Startup & Entrepreneurship Committee";

export const COMMITTEE_ACTIVITY_TYPES: { value: CommitteeActivityType; label: string }[] = [
  { value: "verification", label: "Verification" },
  { value: "report", label: "Report" },
  { value: "program", label: "Program" },
  { value: "event", label: "Event" },
  { value: "update", label: "Update" },
  { value: "initiative", label: "Initiative" },
];

export const COMMITTEE_ACTIVITY_TYPE_STYLES: Record<
  CommitteeActivityType,
  { badge: string; date: string }
> = {
  verification: { badge: "bg-emerald-50 text-emerald-700", date: "text-emerald-600" },
  report: { badge: "bg-teal-50 text-teal-700", date: "text-teal-600" },
  program: { badge: "bg-orange-50 text-orange-700", date: "text-orange-600" },
  event: { badge: "bg-red-50 text-red-700", date: "text-red-600" },
  update: { badge: "bg-sky-50 text-sky-700", date: "text-sky-600" },
  initiative: { badge: "bg-violet-50 text-violet-700", date: "text-violet-600" },
};

export function committeeActivityTypeLabel(type: CommitteeActivityType) {
  return COMMITTEE_ACTIVITY_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function committeeMemberName(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.replace(/[._-]/g, " ").trim().split(/\s+/);
  if (parts.length >= 2) {
    return parts
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
  }
  return local.charAt(0).toUpperCase() + local.slice(1);
}
