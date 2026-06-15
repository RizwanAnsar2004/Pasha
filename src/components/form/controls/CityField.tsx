"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { YesNo } from "@/components/ui/RadioCard";
import { HQ_CITIES } from "@/lib/options";
import { COUNTRIES } from "@/lib/countries";
import type { SubmissionInput } from "@/lib/schema";

/**
 * Composite location control for the apply form.
 *
 * State machine:
 *   outside_pakistan = false  → show city dropdown
 *                              ↳ if "Other" picked, show hq_other text input
 *   outside_pakistan = true   → hide city dropdown, show country dropdown
 *
 * Writes to: hq_city, hq_other, outside_pakistan, hq_country.
 *
 * The schema's superRefine enforces the right field is filled per branch
 * so users can't accidentally submit a row with both city + country set.
 */
export function CityField() {
  const form = useFormContext<SubmissionInput>();
  const errors = form.formState.errors;
  const outsidePakistan = useWatch({ control: form.control, name: "outside_pakistan" }) as boolean | undefined;
  const hqCity = useWatch({ control: form.control, name: "hq_city" }) as string | undefined;

  return (
    <div className="space-y-4">
      {/* Inline Yes/No for "Outside Pakistan?" — same chrome as every other
          boolean field in the form, per the v2 design. */}
      <Field
        label="Outside Pakistan?"
        hint="Toggle on if your HQ is in another country."
      >
        <YesNo
          value={!!outsidePakistan}
          onChange={(v) => {
            form.setValue("outside_pakistan", v, { shouldDirty: true });
            // Reset the other branch's data so we don't carry stale values.
            if (v) {
              form.setValue("hq_city", "", { shouldDirty: true });
              form.setValue("hq_other", "", { shouldDirty: true });
            } else {
              form.setValue("hq_country", "", { shouldDirty: true });
            }
          }}
          aria-label="Outside Pakistan?"
        />
      </Field>

      {!outsidePakistan ? (
        <>
          <Field
            label="HQ city"
            required
            error={errors.hq_city?.message as string | undefined}
          >
            <Select
              {...form.register("hq_city")}
              placeholder="Select your city"
              options={[...HQ_CITIES]}
            />
          </Field>
          {hqCity === "Other" && (
            <Field
              label="Which city?"
              required
              error={errors.hq_other?.message as string | undefined}
            >
              <Input placeholder="e.g. Bhakkar" {...form.register("hq_other")} />
            </Field>
          )}
        </>
      ) : (
        <Field
          label="Country"
          required
          error={errors.hq_country?.message as string | undefined}
        >
          <Select
            {...form.register("hq_country")}
            placeholder="Select country"
            options={[...COUNTRIES]}
          />
        </Field>
      )}
    </div>
  );
}
