"use client";

import type { StepProps } from "../ApplyForm";
import { FoundersRepeater } from "../controls/FoundersRepeater";

/**
 * Step 2 — Founders
 *
 * Per-founder rows (name, role, email, mobile, socials, photo, gender) live
 * inside FoundersRepeater. The schema enforces that the first founder is the
 * primary submitter with email + mobile required; subsequent founders only
 * need name + role so adding a third cofounder isn't blocked by missing
 * contact details.
 *
 * Counts (total founders / female founders) are derived from the founders
 * array at submit time — no separate fields. is_pasha_member moved to
 * Step 1 (next to FBR / SECP toggles).
 *
 * This same array is later rendered as the Y Combinator-style "Key Persons"
 * section on the public detail page (see src/components/KeyPersons.tsx).
 */
export function Step2Founders({ form }: StepProps) {
  const { formState: { errors } } = form;
  const foundersRootError =
    (errors.founders as { root?: { message?: string }; message?: string } | undefined)?.root
      ?.message ??
    (errors.founders as { message?: string } | undefined)?.message;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-pasha-muted leading-relaxed">
          The first row is you — the primary contact for this application.
          Add as many co-founders as you have. Photos, roles, and social
          links appear on your public profile as a Key Persons section.
        </p>
        {foundersRootError && (
          <p className="mt-3 text-sm text-pasha-red">{foundersRootError}</p>
        )}
      </div>

      <FoundersRepeater />
    </div>
  );
}
