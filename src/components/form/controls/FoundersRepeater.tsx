"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2, Star, X as XIcon } from "lucide-react";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/Input";
import { SelectField } from "@/components/form/SelectField";
import { FileUpload } from "@/components/form/FileUpload";
import { FOUNDER_GENDERS } from "@/lib/options";
import { useOptionList } from "@/components/form/OptionListsContext";
import type { SubmissionInput } from "@/lib/forms/schema";
import { phoneRegisterProps } from "@/lib/validators/phone";
import { cn } from "@/lib/utils";

// Add/remove founder cards. The first card is the primary submitter and
export function FoundersRepeater() {
  const form = useFormContext<SubmissionInput>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "founders",
  });
  const errors = form.formState.errors;
  // Single source of truth: admin-managed list, code constant as fallback.
  const genders = useOptionList("FOUNDER_GENDERS", FOUNDER_GENDERS);

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
                <SelectField
                  name={`founders.${idx}.gender`}
                  placeholder="Select gender"
                  options={genders}
                />
              </Field>
            </div>

            <Field label="Photo" hint="Square is best. JPG / PNG, up to 5MB.">
              <FoundersPhotoUploadField index={idx} />
            </Field>

            {/* Per-founder social links. LinkedIn was first-class; X / */}
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

// Inline editor for the founders[i].custom_links sub-array. Each row is
function CustomLinksField({ founderIndex }: { founderIndex: number }) {
  const form = useFormContext<SubmissionInput>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `founders.${founderIndex}.custom_links` as const,
  });

  // These rows validate like any other field, but had no error slot — a bad
  // link failed the whole founder with nothing shown next to the input.
  const rowErrors = (form.formState.errors.founders?.[founderIndex] as
    | { custom_links?: { label?: { message?: string }; url?: { message?: string } }[] }
    | undefined)?.custom_links;

  // Most "invalid URL" reports are just a missing scheme — add it on blur
  // rather than rejecting "github.com/name".
  const normalizeUrl = (i: number) => {
    const path = `founders.${founderIndex}.custom_links.${i}.url` as const;
    const raw = (form.getValues(path) ?? "").trim();
    if (!raw || /^https?:\/\//i.test(raw)) return;
    form.setValue(path, `https://${raw}`, { shouldValidate: true });
  };

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-pasha-muted">
          Custom links — GitHub, personal site, Substack, anything else
        </span>
      </div>
      {fields.length > 0 && (
        <div className="space-y-2 mb-2">
          {fields.map((row, i) => {
            const labelErr = rowErrors?.[i]?.label?.message;
            const urlErr = rowErrors?.[i]?.url?.message;
            return (
              <div key={row.id}>
                <div className="flex items-start gap-2">
                  <div className="w-full max-w-[180px]">
                    <Input
                      placeholder="Label (e.g. GitHub)"
                      aria-invalid={Boolean(labelErr)}
                      data-field={`founders.${founderIndex}.custom_links.${i}.label`}
                      {...form.register(`founders.${founderIndex}.custom_links.${i}.label`)}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Input
                      type="url"
                      placeholder="https://"
                      aria-invalid={Boolean(urlErr)}
                      data-field={`founders.${founderIndex}.custom_links.${i}.url`}
                      {...form.register(`founders.${founderIndex}.custom_links.${i}.url`, {
                        onBlur: () => normalizeUrl(i),
                      })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label="Remove link"
                    className="shrink-0 rounded-md p-1.5 text-pasha-muted hover:text-pasha-red hover:bg-pasha-red/[0.04] transition-colors"
                  >
                    <XIcon className="w-4 h-4" aria-hidden />
                  </button>
                </div>
                {(labelErr || urlErr) && (
                  <p className="mt-1 text-xs text-pasha-red">{labelErr ?? urlErr}</p>
                )}
              </div>
            );
          })}
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

// Tiny adapter so FileUpload can read/write the correct dotted path in the
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
