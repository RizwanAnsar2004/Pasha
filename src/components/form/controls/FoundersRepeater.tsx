"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2, Star, X as XIcon } from "lucide-react";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FileUpload } from "@/components/form/FileUpload";
import { FOUNDER_GENDERS } from "@/lib/options";
import type { SubmissionInput } from "@/lib/schema";
import { phoneRegisterProps } from "@/lib/phone";
import { cn } from "@/lib/utils";

/**
 * Add/remove founder cards. The first card is the primary submitter and
 * cannot be removed. The schema's superRefine guarantees the first founder
 * has email + mobile required; secondary founders are looser.
 *
 * Each card has: name, role, email, mobile, LinkedIn, photo, gender.
 *
 * The detail page reads `founders` JSONB → renders a Y Combinator-style
 * Key Persons grid.
 */
export function FoundersRepeater() {
  const form = useFormContext<SubmissionInput>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "founders",
  });
  const errors = form.formState.errors;

  return (
    <div className="space-y-5">
      {fields.map((row, idx) => {
        const isPrimary = idx === 0;
        // RHF nests errors under founders[idx].field.
        const founderErr = errors.founders?.[idx] as Record<string, { message?: string }> | undefined;

        return (
          <div
            key={row.id}
            className={cn(
              "rounded-xl border bg-white p-5 sm:p-6 space-y-4",
              isPrimary ? "border-pasha-red/30 bg-pasha-red/[0.02]" : "border-pasha-line"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-pasha-ink inline-flex items-center gap-2">
                {isPrimary ? (
                  <>
                    <Star className="w-3.5 h-3.5 text-pasha-red" aria-hidden />
                    <span>Primary founder (you)</span>
                  </>
                ) : (
                  <span>Founder #{idx + 1}</span>
                )}
              </h3>
              {!isPrimary && (
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="inline-flex items-center gap-1.5 text-xs text-pasha-muted hover:text-pasha-red transition-colors px-2 py-1 rounded-md hover:bg-pasha-red/[0.04]"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden />
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Full name"
                required={isPrimary}
                error={founderErr?.name?.message}
              >
                <Input
                  placeholder="Founder's full name"
                  {...form.register(`founders.${idx}.name`)}
                />
              </Field>
              <Field
                label="Role"
                required={isPrimary}
                hint="e.g. CEO, CTO, Co-founder"
                error={founderErr?.role?.message}
              >
                <Input
                  placeholder="e.g. CEO"
                  {...form.register(`founders.${idx}.role`)}
                />
              </Field>
              <Field
                label="Email"
                required={isPrimary}
                error={founderErr?.email?.message}
              >
                <Input
                  type="email"
                  placeholder="founder@startup.com"
                  {...form.register(`founders.${idx}.email`)}
                />
              </Field>
              <Field
                label="Mobile"
                required={isPrimary}
                error={founderErr?.mobile?.message}
              >
                <Input
                  placeholder="+92 300 1234567"
                  {...phoneRegisterProps(form.register(`founders.${idx}.mobile`))}
                />
              </Field>
              <Field label="Gender" error={founderErr?.gender?.message}>
                <Select
                  {...form.register(`founders.${idx}.gender`)}
                  placeholder="Select gender"
                  options={[...FOUNDER_GENDERS]}
                />
              </Field>
            </div>

            <Field label="Photo" hint="Square is best. JPG / PNG, up to 5MB.">
              <FoundersPhotoUploadField index={idx} />
            </Field>

            {/* Per-founder social links. LinkedIn was first-class; X /
                Instagram / Facebook are now native. Plus a repeatable
                "custom links" sub-array for anything else (GitHub, blog,
                Substack, etc.). All optional. */}
            <div className="pt-2 border-t border-pasha-line/60">
              <h4 className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-muted mb-3">
                Social links
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="LinkedIn" error={founderErr?.linkedin?.message}>
                  <Input
                    type="url"
                    placeholder="https://www.linkedin.com/in/..."
                    {...form.register(`founders.${idx}.linkedin`)}
                  />
                </Field>
                <Field label="X / Twitter" error={founderErr?.x?.message}>
                  <Input
                    type="url"
                    placeholder="https://x.com/..."
                    {...form.register(`founders.${idx}.x`)}
                  />
                </Field>
                <Field label="Instagram" error={founderErr?.instagram?.message}>
                  <Input
                    type="url"
                    placeholder="https://instagram.com/..."
                    {...form.register(`founders.${idx}.instagram`)}
                  />
                </Field>
                <Field label="Facebook" error={founderErr?.facebook?.message}>
                  <Input
                    type="url"
                    placeholder="https://facebook.com/..."
                    {...form.register(`founders.${idx}.facebook`)}
                  />
                </Field>
              </div>
              <CustomLinksField founderIndex={idx} />
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() =>
          append({
            name: "",
            role: "",
            email: "",
            mobile: "",
            linkedin: "",
            x: "",
            instagram: "",
            facebook: "",
            custom_links: [],
            photo_url: "",
            gender: "",
            is_primary: false,
          })
        }
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-pasha-line bg-white px-4 py-2 text-sm text-pasha-ink hover:border-pasha-red hover:text-pasha-red transition-colors"
      >
        <Plus className="w-4 h-4" aria-hidden />
        Add another founder
      </button>
    </div>
  );
}

/**
 * Inline editor for the founders[i].custom_links sub-array. Each row is
 * {label, url}. Empty rows are stripped at submit time by the schema
 * preprocessor.
 */
function CustomLinksField({ founderIndex }: { founderIndex: number }) {
  const form = useFormContext<SubmissionInput>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `founders.${founderIndex}.custom_links` as const,
  });

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-pasha-muted">
          Custom links — GitHub, personal site, Substack, anything else
        </span>
      </div>
      {fields.length > 0 && (
        <div className="space-y-2 mb-2">
          {fields.map((row, i) => (
            <div key={row.id} className="flex items-center gap-2">
              <Input
                placeholder="Label (e.g. GitHub)"
                className="max-w-[180px]"
                {...form.register(`founders.${founderIndex}.custom_links.${i}.label`)}
              />
              <Input
                type="url"
                placeholder="https://"
                {...form.register(`founders.${founderIndex}.custom_links.${i}.url`)}
              />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove link"
                className="shrink-0 rounded-md p-1.5 text-pasha-muted hover:text-pasha-red hover:bg-pasha-red/[0.04] transition-colors"
              >
                <XIcon className="w-4 h-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => append({ label: "", url: "" })}
        className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[1.5px] text-pasha-muted hover:text-pasha-red transition-colors"
      >
        <Plus className="w-3 h-3" aria-hidden />
        Add link
      </button>
    </div>
  );
}

/**
 * Tiny adapter so FileUpload can read/write the correct dotted path in the
 * RHF state. Kept inline here so the rest of the form doesn't need to know
 * about the JSON path shape.
 */
function FoundersPhotoUploadField({ index }: { index: number }) {
  const form = useFormContext<SubmissionInput>();
  const value = form.watch(`founders.${index}.photo_url`) as string | undefined;
  return (
    <FileUpload
      bucket="founder-photos"
      label="Upload photo"
      hint="Optional — square photo (JPG/PNG) up to 5MB."
      accept={{
        "image/jpeg": [".jpg", ".jpeg", ".jfif", ".jfi", ".pjpeg", ".pjp"],
        "image/png": [".png"],
        "image/webp": [".webp"],
      }}
      value={value || undefined}
      onChange={(url) =>
        form.setValue(`founders.${index}.photo_url`, url ?? "", { shouldDirty: true })
      }
    />
  );
}
