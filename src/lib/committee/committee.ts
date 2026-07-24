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

// 'secretariat' is the P@SHA Secretariat — a body distinct from the Committee,
// shown on the public rosters under its own tag. It carries the same rights as
// 'member' (i.e. none for management); only 'admin' and 'chairman' can manage
// committee members. Mirrored by the admin_users_member_type_chk CHECK
// constraint — widening this union needs a migration.
export type CommitteeMemberType = "chairman" | "member" | "secretariat" | "admin";

export const COMMITTEE_MEMBER_TYPES: { value: CommitteeMemberType; label: string }[] = [
  { value: "chairman", label: "Chairman" },
  { value: "member", label: "Committee Member" },
  { value: "secretariat", label: "Secretariat" },
  { value: "admin", label: "Admin" },
];

// Types listed on the public /committee and /about rosters. 'admin' is an
// access role rather than a public one, so it is deliberately absent.
export const PUBLIC_COMMITTEE_MEMBER_TYPES: CommitteeMemberType[] = [
  "chairman",
  "member",
  "secretariat",
];

export function isPublicCommitteeMember(type: CommitteeMemberType) {
  return PUBLIC_COMMITTEE_MEMBER_TYPES.includes(type);
}

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
export const COMMITTEE_SECRETARIAT_TAG = "Secretariat";

// Chip text on a public roster card. Secretariat members share the committee
// card layout but must not be labelled "Committee Member" — they are a separate
// body. 'admin' never reaches a public card, so it falls back to the plain label.
export function committeeMemberTagLabel(type: CommitteeMemberType) {
  if (type === "secretariat") return COMMITTEE_SECRETARIAT_TAG;
  if (type === "member") return COMMITTEE_MEMBER_TAG;
  return committeeMemberTypeLabel(type);
}

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
