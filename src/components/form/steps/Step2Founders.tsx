"use client";

import type { StepProps } from "../ApplyForm";
import { FoundersRepeater } from "../controls/FoundersRepeater";

// Step 2 — Founders
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
