"use client";

import { createContext, useContext, useId, type ReactNode } from "react";
import { Label, FieldHint, FieldError } from "@/components/ui/Label";

// Context lets nested inputs pick up the generated id + describedby ids, so screen readers announce field labels + hints + errors correctly.
type FieldContextValue = {
  inputId: string;
  hintId: string;
  errorId: string;
  hasError: boolean;
};

const FieldContext = createContext<FieldContextValue | null>(null);

export function useFieldContext() {
  return useContext(FieldContext);
}

// Applicant-facing forms opt in to auto "(optional)" tags: inside this provider
// every Field that isn't explicitly `required` labels itself optional. Kept as
// an opt-in because admin screens bake "*" into the label text themselves, and
// would otherwise render "Title * (optional)".
const AutoOptionalContext = createContext(false);

export function AutoOptionalLabels({ children }: { children: ReactNode }) {
  return <AutoOptionalContext.Provider value>{children}</AutoOptionalContext.Provider>;
}

export function Field({
  label,
  hint,
  error,
  required,
  optional,
  children,
  className,
  htmlFor,
}: {
  label?: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  // Defaults to the inverse of `required` — anything not required IS optional,
  // and applicants shouldn't have to infer that from a missing asterisk. Pass
  // `optional={false}` to suppress the tag on a specific field.
  optional?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  const autoId = useId();
  const autoOptional = useContext(AutoOptionalContext);
  const inputId = htmlFor ?? `field-${autoId}`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  return (
    <FieldContext.Provider
      value={{ inputId, hintId, errorId, hasError: !!error }}
    >
      <div className={`flex flex-col gap-2 ${className ?? ""}`}>
        {/* Label stays a single, clean line — the descriptive hint renders as a */}
        {label && (
          <Label
            htmlFor={inputId}
            required={required}
            optional={optional ?? (required === false || (autoOptional && !required))}
          >
            {label}
          </Label>
        )}
        {children}
        {hint && <FieldHint id={hintId}>{hint}</FieldHint>}
        {error && <FieldError id={errorId}>{error}</FieldError>}
      </div>
    </FieldContext.Provider>
  );
}
