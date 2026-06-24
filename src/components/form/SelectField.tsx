"use client";

import { useController, useFormContext } from "react-hook-form";
import { useFieldContext } from "@/components/form/Field";
import { SelectMenu, type SelectMenuOption } from "@/components/ui/SelectMenu";
import { cn } from "@/lib/utils";

interface SelectFieldProps {
  /** react-hook-form field path. */
  name: string;
  options: readonly (string | SelectMenuOption)[];
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * react-hook-form adapter around <SelectMenu>. Drop-in replacement for the
 * old `<Select {...register("field")} …>` pattern — pass `name` instead of
 * spreading register(). Picks up the surrounding <Field> for label/aria
 * wiring. All actual select UI lives in SelectMenu, so swapping the dropdown
 * library is still a one-file change.
 */
export function SelectField({
  name,
  options,
  placeholder,
  searchable,
  disabled,
  className,
}: SelectFieldProps) {
  const { control } = useFormContext();
  const ctx = useFieldContext();
  const { field } = useController({ name, control });

  return (
    <SelectMenu
      id={ctx?.inputId}
      value={typeof field.value === "string" ? field.value : ""}
      onValueChange={field.onChange}
      onBlur={field.onBlur}
      options={options}
      placeholder={placeholder}
      searchable={searchable}
      disabled={disabled}
      className={cn("w-full", className)}
      aria-invalid={ctx?.hasError || undefined}
      aria-describedby={ctx?.hasError ? ctx.errorId : ctx?.hintId}
    />
  );
}
