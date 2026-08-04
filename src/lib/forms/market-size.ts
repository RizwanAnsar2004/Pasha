// TAM ≥ SAM ≥ SOM by definition: the obtainable market is a portion of the
// serviceable market, which is a portion of the total addressable market.
// Applicants have submitted these inverted, which renders on the public profile
// as an obtainable market many times larger than the total one — arithmetically
// impossible, and read by investors as proof the listings aren't checked.
//
// Kept out of the field schemas because the three fields are admin-configurable
// (they may be absent, reordered, or renamed on a given form) and because a
// cross-field rule has to see all three at once, which a per-field schema
// cannot. Shared so the initial submission and the post-submission edit flow
// enforce the same rule.

// Values arrive as numbers from a number input, but as strings when the admin
// form config renders them as text — accept either, and treat anything
// unparseable as absent so a blank or malformed entry falls through to the
// field's own schema rather than being reported as an ordering error.
export function marketAmount(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// `label` carries the acronym so callers without a form-config label map can
// still build a readable message; callers that have one should prefer it, since
// an admin may have renamed the field.
export type MarketSizeIssue = {
  path: PropertyKey[];
  label: string;
  message: string;
  // The field this one was measured against. A live (as-you-type) check needs
  // it: with SAM already filled, typing the first digit of a larger TAM briefly
  // looks like an inversion, so the UI holds the error until BOTH fields have
  // been left. Server-side callers ignore this.
  comparedTo: string;
};

// Full user-facing sentence, for callers with no label map of their own.
export function marketSizeMessage(issue: MarketSizeIssue): string {
  return `${issue.label} ${issue.message}`;
}

// Returns the first ordering violation among TAM/SAM/SOM, or null when the
// figures are consistent. Each pair is only compared when both of its values
// are present, so a partially filled market step still submits.
export function marketSizeIssue(
  values: Record<string, unknown>
): MarketSizeIssue | null {
  const tam = marketAmount(values.tam_amount);
  const sam = marketAmount(values.sam_amount);
  const som = marketAmount(values.som_amount);

  if (tam !== null && sam !== null && sam > tam) {
    return {
      path: ["sam_amount"],
      label: "SAM",
      message:
        "cannot be larger than TAM. The serviceable market is a portion of the total addressable market.",
      comparedTo: "tam_amount",
    };
  }
  if (sam !== null && som !== null && som > sam) {
    return {
      path: ["som_amount"],
      label: "SOM",
      message:
        "cannot be larger than SAM. The obtainable market is a portion of the serviceable market.",
      comparedTo: "sam_amount",
    };
  }
  // With SAM left blank the two checks above never run, so TAM vs SOM would go
  // unchecked — the inversion is just as wrong with a gap in the middle.
  if (sam === null && tam !== null && som !== null && som > tam) {
    return {
      path: ["som_amount"],
      label: "SOM",
      message:
        "cannot be larger than TAM. The obtainable market is a portion of the total addressable market.",
      comparedTo: "tam_amount",
    };
  }
  return null;
}
