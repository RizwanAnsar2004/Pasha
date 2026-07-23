"use client";

import { focusFormField } from "@/lib/forms/focus-field";

// The field names in a validation banner, rendered as buttons that scroll to
// and focus the offending input — so a long step doesn't leave the applicant
// hunting for what "needs" fixing.
export function ErrorFieldLinks({
  fields,
}: {
  fields: { name: string; label: string }[];
}) {
  if (fields.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {fields.map((f) => (
        <button
          key={f.name}
          type="button"
          onClick={() => focusFormField(f.name)}
          className="rounded-full border border-pasha-red/30 bg-white px-3 py-1 text-xs font-medium text-pasha-red transition-colors hover:bg-pasha-red hover:text-white"
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
