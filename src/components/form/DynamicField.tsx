"use client";

import { useFormContext, useWatch, useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Field } from "@/components/form/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { SelectField } from "@/components/form/SelectField";
import { RichTextField } from "@/components/form/RichTextField";
import { CheckboxGroup, YesNo, RadioCardGroup } from "@/components/ui/RadioCard";
import { FileUpload } from "@/components/form/FileUpload";
import { CityField } from "@/components/form/controls/CityField";
import { FoundersRepeater } from "@/components/form/controls/FoundersRepeater";
import { InputType, htmlInputType } from "@/lib/form-enums";
import { phoneRegisterProps } from "@/lib/phone";
import { resolveOptions, type FormFieldConfig } from "@/lib/form-config";
import { useOptionRegistry } from "@/components/form/OptionListsContext";

// Read a nested error message off RHF's errors object by dotted path.
function errorAt(errors: unknown, path: string): string | undefined {
  let cur: unknown = errors;
  for (const part of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  const msg = (cur as { message?: unknown } | undefined)?.message;
  return typeof msg === "string" ? msg : undefined;
}

/**
 * Renders one config-defined field at the given RHF path. `namePrefix` is set
 * when the field lives inside a (possibly repeated) GROUP, e.g. "members.0".
 * GROUP fields recurse; repeatable GROUPs render an add/remove card list.
 *
 * Hooks are all called unconditionally at the top so the call order is stable
 * regardless of input_type (rules-of-hooks safe).
 */
export function DynamicField({
  field,
  namePrefix,
}: {
  field: FormFieldConfig;
  namePrefix?: string;
}) {
  const form = useFormContext();
  const optionRegistry = useOptionRegistry();
  const path = namePrefix ? `${namePrefix}.${field.field_key}` : field.field_key;

  const condName = field.conditional
    ? namePrefix
      ? `${namePrefix}.${field.conditional.field_key}`
      : field.conditional.field_key
    : "__noop_cond__";
  const condValue = useWatch({ control: form.control, name: condName });
  const value = useWatch({ control: form.control, name: path });

  // Built-in composite controls — only meaningful at the top level.
  if (!namePrefix && field.input_type === InputType.CITY_COMPOSITE) {
    return <CityField />;
  }
  if (!namePrefix && field.input_type === InputType.GROUP && field.field_key === "founders") {
    return (
      <Field label={field.label ?? undefined} hint={field.hint ?? undefined}>
        <FoundersRepeater />
      </Field>
    );
  }

  // Conditional visibility — hide unless the named sibling equals the value.
  if (field.conditional && condValue !== field.conditional.equals) return null;
  if (field.visible === false) return null;

  // HEADING — a label-only divider for visual sub-grouping within a step.
  if (field.input_type === InputType.HEADING) {
    return (
      <div className="flex items-center gap-3 pt-2">
        <h3 className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-red font-semibold whitespace-nowrap">
          {field.label}
        </h3>
        <span className="h-px flex-1 bg-pasha-line/70" />
      </div>
    );
  }

  if (field.input_type === InputType.GROUP) {
    return <GroupField field={field} path={path} />;
  }

  const error = errorAt(form.formState.errors, path);
  const label = field.label ?? undefined;
  const hint = field.hint ?? undefined;
  const required = field.required;

  switch (field.input_type) {
    case InputType.TEXTAREA:
      return (
        <Field label={label} hint={hint} required={required} error={error}>
          <Textarea placeholder={field.placeholder ?? undefined} {...form.register(path)} />
        </Field>
      );

    case InputType.RICH_TEXT:
      return (
        <Field label={label} hint={hint} required={required} error={error}>
          <RichTextField name={path} />
        </Field>
      );

    case InputType.SELECT:
      return (
        <Field label={label} hint={hint} required={required} error={error}>
          <SelectField
            name={path}
            placeholder={field.placeholder ?? "Select…"}
            options={resolveOptions(field, optionRegistry)}
          />
        </Field>
      );

    case InputType.MULTISELECT:
      return (
        <Field label={label} hint={hint} required={required} error={error}>
          <CheckboxGroup
            value={(value as string[]) ?? []}
            onChange={(v) => form.setValue(path, v, { shouldDirty: true, shouldValidate: true })}
            options={resolveOptions(field, optionRegistry).map((o) => o.value)}
            aria-label={label}
          />
        </Field>
      );

    case InputType.RADIO_CARDS:
      return (
        <Field label={label} hint={hint} required={required} error={error}>
          <RadioCardGroup
            value={value as string | undefined}
            onChange={(v) => form.setValue(path, v, { shouldDirty: true, shouldValidate: true })}
            options={resolveOptions(field, optionRegistry)}
            aria-label={label}
          />
        </Field>
      );

    case InputType.YES_NO:
      return (
        <Field label={label} hint={hint} required={required} error={error}>
          <YesNo
            value={value as boolean | undefined}
            onChange={(v) => form.setValue(path, v, { shouldDirty: true, shouldValidate: true })}
            aria-label={label}
          />
        </Field>
      );

    case InputType.FILE_UPLOAD: {
      const v = field.validation ?? {};
      return (
        <Field label={label} hint={hint} required={required} error={error}>
          <FileUpload
            bucket={v.bucket ?? "logos"}
            label={field.placeholder ?? "Upload file"}
            hint={hint}
            accept={v.accept}
            maxSizeMB={v.maxSizeMB ?? 5}
            value={(value as string | undefined) || undefined}
            onChange={(url) => form.setValue(path, url ?? "", { shouldDirty: true })}
          />
        </Field>
      );
    }

    default: {
      // TEXT, EMAIL, URL, PHONE, NUMBER, DATE
      const reg = form.register(path);
      if (field.input_type === InputType.NUMBER) {
        const current = value as number | string | undefined;
        return (
          <NumberField
            field={field}
            path={path}
            label={label}
            hint={hint}
            required={required}
            error={error}
            value={current}
            namePrefix={namePrefix}
          />
        );
      }
      return (
        <Field label={label} hint={hint} required={required} error={error}>
          <Input
            placeholder={field.placeholder ?? undefined}
            {...(field.input_type === InputType.PHONE
              ? phoneRegisterProps(reg)
              : { type: htmlInputType(field.input_type), ...reg })}
          />
        </Field>
      );
    }
  }
}

function NumberField({
  field,
  path,
  label,
  hint,
  required,
  error,
  value,
  namePrefix,
}: {
  field: FormFieldConfig;
  path: string;
  label?: string;
  hint?: string;
  required?: boolean;
  error?: string;
  value: number | string | undefined;
  namePrefix?: string;
}) {
  const form = useFormContext();

  // Cross-field rule: female_employees must not exceed total_employees.
  const isFemale = field.field_key === "female_employees";
  const isTotal = field.field_key === "total_employees";
  const totalPath = namePrefix ? `${namePrefix}.total_employees` : "total_employees";
  const femalePath = namePrefix ? `${namePrefix}.female_employees` : "female_employees";
  const totalVal = useWatch({ control: form.control, name: totalPath });
  const femaleVal = useWatch({ control: form.control, name: femalePath });

  let crossError: string | undefined;
  if ((isFemale || isTotal) && typeof totalVal === "number" && typeof femaleVal === "number" && femaleVal > totalVal) {
    crossError = isFemale
      ? "Female employees cannot exceed total employees"
      : "Total employees cannot be less than female employees";
  }

  return (
    <Field label={label} hint={hint} required={required} error={error ?? crossError}>
      <Input
        type="text"
        inputMode="numeric"
        placeholder={field.placeholder ?? undefined}
        value={value ?? ""}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          form.setValue(
            path,
            digits === "" ? undefined : Number(digits),
            { shouldDirty: true, shouldValidate: true }
          );
        }}
      />
    </Field>
  );
}

// A subsection. Non-repeatable → just its children. Repeatable → a card list
// with Add/Remove bounded by min/max (the generic "members" repeater).
function GroupField({ field, path }: { field: FormFieldConfig; path: string }) {
  if (!field.repeatable) {
    return (
      <fieldset className="space-y-5 rounded-xl border border-pasha-line bg-white p-5">
        {field.label && (
          <legend className="px-1 text-sm font-medium text-pasha-ink">{field.label}</legend>
        )}
        {field.hint && <p className="text-xs text-pasha-muted">{field.hint}</p>}
        {(field.children ?? []).map((child) => (
          <DynamicField key={child.id} field={child} namePrefix={path} />
        ))}
      </fieldset>
    );
  }
  return <RepeatableGroup field={field} path={path} />;
}

function RepeatableGroup({ field, path }: { field: FormFieldConfig; path: string }) {
  const form = useFormContext();
  const { fields, append, remove } = useFieldArray({ control: form.control, name: path });
  const itemLabel = field.item_label ?? "item";
  const max = field.max_items ?? Infinity;
  const min = field.min_items ?? 0;

  const blankItem = () => {
    const obj: Record<string, unknown> = {};
    for (const c of field.children ?? []) {
      obj[c.field_key] =
        c.input_type === InputType.MULTISELECT
          ? []
          : c.input_type === InputType.YES_NO
          ? false
          : "";
    }
    return obj;
  };

  return (
    <div className="space-y-4">
      {field.label && <h3 className="text-sm font-medium text-pasha-ink">{field.label}</h3>}
      {field.hint && <p className="text-xs text-pasha-muted -mt-2">{field.hint}</p>}
      {fields.map((row, idx) => (
        <div key={row.id} className="rounded-xl border border-pasha-line bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-pasha-ink">
              {itemLabel} #{idx + 1}
            </span>
            {fields.length > min && (
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
          {(field.children ?? []).map((child) => (
            <DynamicField key={child.id} field={child} namePrefix={`${path}.${idx}`} />
          ))}
        </div>
      ))}
      {fields.length < max && (
        <button
          type="button"
          onClick={() => append(blankItem())}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-pasha-line bg-white px-4 py-2 text-sm text-pasha-ink hover:border-pasha-red hover:text-pasha-red transition-colors"
        >
          <Plus className="w-4 h-4" aria-hidden />
          Add {itemLabel}
        </button>
      )}
    </div>
  );
}
