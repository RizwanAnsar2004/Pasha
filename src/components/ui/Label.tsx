import { forwardRef, type LabelHTMLAttributes, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  // Renders a muted "Optional" tag — the counterpart to the required asterisk,
  // so applicants never have to guess which fields they can skip.
  optional?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, optional, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-sm font-medium text-pasha-ink leading-snug", className)}
      {...props}
    >
      {children}
      {required && (
        <>
          <span aria-hidden className="ml-1 text-pasha-red">*</span>
          <span className="sr-only">(required)</span>
        </>
      )}
      {!required && optional && (
        <span className="ml-1.5 text-xs font-normal text-pasha-muted">(optional)</span>
      )}
    </label>
  )
);
Label.displayName = "Label";

export function FieldHint({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <p id={id} className={cn("text-xs text-pasha-muted leading-relaxed", className)}>
      {children}
    </p>
  );
}

export function FieldError({
  children,
  id,
}: HTMLAttributes<HTMLParagraphElement> & { children?: React.ReactNode; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="text-xs text-pasha-red flex items-center gap-1.5">
      <svg aria-hidden className="w-3 h-3" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.25" />
        <path d="M6 3.5v3M6 8.25v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
      {children}
    </p>
  );
}
