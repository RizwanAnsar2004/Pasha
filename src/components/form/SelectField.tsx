"use client";

import { useEffect } from "react";
import { useController, useFormContext } from "react-hook-form";
import { useFieldContext } from "@/components/form/Field";
import { SelectMenu, type SelectMenuOption } from "@/components/ui/SelectMenu";
import { coerceOptionValue } from "@/lib/options/choice";
import type { OptionItem } from "@/lib/options/types";
import { cn } from "@/lib/utils";

interface SelectFieldProps {
  // react-hook-form field path.
  name: string;
  options: readonly (string | SelectMenuOption | OptionItem)[];
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
}

// react-hook-form adapter around <SelectMenu>. Drop-in replacement for the
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

  const current = typeof field.value === "string" ? field.value : "";
  const resolved = coerceOptionValue(current, options);

  // A draft saved before the id migration holds legacy text — upgrade it to the option id.
  useEffect(() => {
    if (resolved && resolved !== current) field.onChange(resolved);
  }, [resolved, current, field]);

  return (
    <SelectMenu
      id={ctx?.inputId}
      value={resolved}
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
