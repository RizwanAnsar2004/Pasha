import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { useFieldContext } from "@/components/form/Field";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
  options: readonly string[] | { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, placeholder, options, id, "aria-describedby": ariaDescribedBy, "aria-invalid": ariaInvalid, defaultValue, ...props }, ref) => {
    const ctx = useFieldContext();
    const finalId = id ?? ctx?.inputId;
    const describedBy = ariaDescribedBy ?? (ctx?.hasError ? ctx.errorId : ctx?.hintId);
    const opts = options.map((o) =>
      typeof o === "string" ? { value: o, label: o } : o
    );
    // When we render a placeholder option, force defaultValue="" so the
    // browser's initial selection is the disabled placeholder, not the
    // first real option (which is the native default behavior). RHF's
    // `register` only sets the value programmatically AFTER mount, so
    // without this the user sees "Karachi" selected on a virgin form.
    const effectiveDefault =
      defaultValue !== undefined ? defaultValue : placeholder ? "" : undefined;
    return (
      <div className="relative">
        <select
          ref={ref}
          id={finalId}
          aria-describedby={describedBy}
          aria-invalid={ariaInvalid ?? ctx?.hasError ? true : undefined}
          defaultValue={effectiveDefault}
          className={cn(
            "flex h-11 w-full max-w-full box-border rounded-lg border border-pasha-line bg-white pl-3.5 pr-9 py-2 text-sm text-pasha-ink shadow-xs transition-colors focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15 disabled:cursor-not-allowed disabled:opacity-60 appearance-none",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pasha-muted"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }
);
Select.displayName = "Select";
