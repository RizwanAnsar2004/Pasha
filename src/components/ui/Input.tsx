import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { useFieldContext } from "@/components/form/Field";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, id, "aria-describedby": ariaDescribedBy, "aria-invalid": ariaInvalid, ...props }, ref) => {
    const ctx = useFieldContext();
    const finalId = id ?? ctx?.inputId;
    const describedBy = ariaDescribedBy ?? (ctx?.hasError ? ctx.errorId : ctx?.hintId);
    return (
      <input
        ref={ref}
        id={finalId}
        aria-describedby={describedBy}
        aria-invalid={ariaInvalid ?? ctx?.hasError ? true : undefined}
        className={cn(
          "flex h-11 w-full rounded-lg border border-pasha-line bg-white px-3.5 py-2 text-sm text-pasha-ink shadow-xs transition-colors placeholder:text-pasha-muted/70 focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15 disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, id, "aria-describedby": ariaDescribedBy, "aria-invalid": ariaInvalid, ...props }, ref) => {
    const ctx = useFieldContext();
    const finalId = id ?? ctx?.inputId;
    const describedBy = ariaDescribedBy ?? (ctx?.hasError ? ctx.errorId : ctx?.hintId);
    return (
      <textarea
        ref={ref}
        id={finalId}
        aria-describedby={describedBy}
        aria-invalid={ariaInvalid ?? ctx?.hasError ? true : undefined}
        className={cn(
          "flex min-h-24 w-full rounded-lg border border-pasha-line bg-white px-3.5 py-2.5 text-sm text-pasha-ink shadow-xs transition-colors placeholder:text-pasha-muted/70 focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15 disabled:cursor-not-allowed disabled:opacity-60 resize-y",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
