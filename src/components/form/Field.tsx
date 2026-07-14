import { createContext, useContext, useId, type ReactNode } from "react";
import { Label, FieldHint, FieldError } from "@/components/ui/Label";

// Context lets nested inputs pick up the generated id + describedby ids,
// so screen readers announce field labels + hints + errors correctly.
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

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
  htmlFor,
}: {
  label?: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  const autoId = useId();
  const inputId = htmlFor ?? `field-${autoId}`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  return (
    <FieldContext.Provider
      value={{ inputId, hintId, errorId, hasError: !!error }}
    >
      <div className={`flex flex-col gap-2 ${className ?? ""}`}>
        {/* Label stays a single, clean line — the descriptive hint renders as a
            subtext line below the input, not inline. This keeps labels a uniform
            height so inputs align across multi-column form grids. */}
        {label && (
          <Label htmlFor={inputId} required={required}>
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
