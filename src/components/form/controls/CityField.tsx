"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/Input";
import { SelectField } from "@/components/form/SelectField";
import { YesNo } from "@/components/ui/RadioCard";
import { HQ_CITIES, isOtherChoice } from "@/lib/options";
import { useOptionList } from "@/components/form/OptionListsContext";
import { COUNTRIES } from "@/lib/constants/countries";
import type { SubmissionInput } from "@/lib/forms/schema";

// Composite location control for the apply form.
export function CityField() {
  const form = useFormContext<SubmissionInput>();
  // Single source of truth: the admin-managed HQ_CITIES list, with the code
  const cities = useOptionList("HQ_CITIES", HQ_CITIES);
  const countries = useOptionList("COUNTRIES", COUNTRIES);
  const errors = form.formState.errors;
  const outsidePakistan = useWatch({ control: form.control, name: "outside_pakistan" }) as boolean | undefined;
  const hqCity = useWatch({ control: form.control, name: "hq_city" }) as string | undefined;

  return (
    <div className="space-y-4">
      {/* Inline Yes/No for "Outside Pakistan?" — same chrome as every other */}
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
            <SelectField
              name="hq_city"
              placeholder="Select your city"
              options={cities}
            />
          </Field>
          {isOtherChoice(hqCity) && (
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
          <SelectField
            name="hq_country"
            placeholder="Select country"
            options={countries}
          />
        </Field>
      )}
    </div>
  );
}
