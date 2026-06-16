// Startup badges (spec §13 `badges` entity + §8–§11 directory CTA / trust
// badges). Isomorphic — no server-only imports — so the same definitions drive
// the applicant dashboard and the public directory.
//
// Badges are DERIVED from existing data rather than stored in a parallel table
// (which would drift): Verified ← databank.pasha_verified, Featured ←
// featured_startups (time-boxed), and Women-led / Hiring / Fundraising ← the
// startup's own answers. Women-led is an opt-in (only shows when the startup
// selects it — spec §9).

export type BadgeKey = "verified" | "featured" | "women_led" | "hiring" | "fundraising";

export type BadgeTone = "verified" | "gold" | "pink" | "blue" | "green";

export type BadgeDef = {
  label: string;
  /** Short pill text. */
  short: string;
  description: string;
  tone: BadgeTone;
  /** Shown on the dashboard when the badge is locked — how to earn it. */
  howTo: string;
};

export const BADGE_DEFS: Record<BadgeKey, BadgeDef> = {
  verified: {
    label: "P@SHA Verified",
    short: "Verified",
    description: "A P@SHA admin has reviewed this profile in good faith.",
    tone: "verified",
    howTo: "Awarded by the P@SHA committee after your profile is approved.",
  },
  featured: {
    label: "Featured",
    short: "Featured",
    description: "Highlighted on the homepage and featured directory section.",
    tone: "gold",
    howTo: "Selected by the committee for the featured section.",
  },
  women_led: {
    label: "Women-led",
    short: "Women-led",
    description: "A women-led startup (shown only when you opt in).",
    tone: "pink",
    howTo: "Set “Is this a women-led startup?” to Yes in Operations & collaboration.",
  },
  hiring: {
    label: "Hiring",
    short: "Hiring",
    description: "Currently hiring — open roles available.",
    tone: "blue",
    howTo: "Turn on “Currently hiring?” in Operations & collaboration.",
  },
  fundraising: {
    label: "Fundraising",
    short: "Fundraising",
    description: "Currently raising — open to investor conversations.",
    tone: "green",
    howTo: "Turn on “Currently fundraising?” in Traction & funding.",
  },
};

// Stable display order.
export const BADGE_ORDER: BadgeKey[] = ["verified", "featured", "women_led", "hiring", "fundraising"];

/** Truthy / `true` / "yes" / "true" → true. Reads JSONB answers or columns. */
export function isYes(v: unknown): boolean {
  if (v === true) return true;
  if (typeof v === "string") return v.trim().toLowerCase() === "yes" || v.trim().toLowerCase() === "true";
  return false;
}

export type BadgeFlags = {
  pashaVerified?: boolean | null;
  featuredActive?: boolean | null;
  womenLed?: boolean | null;
  hiring?: boolean | null;
  fundraising?: boolean | null;
};

export type DerivedBadge = BadgeDef & { key: BadgeKey; earned: boolean };

/**
 * All five badges with an `earned` flag. The dashboard renders all (locked ones
 * greyed with `howTo`); the directory filters to `earned`.
 */
export function deriveBadges(flags: BadgeFlags): DerivedBadge[] {
  const earnedMap: Record<BadgeKey, boolean> = {
    verified: Boolean(flags.pashaVerified),
    featured: Boolean(flags.featuredActive),
    women_led: Boolean(flags.womenLed),
    hiring: Boolean(flags.hiring),
    fundraising: Boolean(flags.fundraising),
  };
  return BADGE_ORDER.map((key) => ({ key, earned: earnedMap[key], ...BADGE_DEFS[key] }));
}

/** Just the earned badges, in display order — for the public directory. */
export function earnedBadges(flags: BadgeFlags): DerivedBadge[] {
  return deriveBadges(flags).filter((b) => b.earned);
}
