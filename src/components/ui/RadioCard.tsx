"use client";

import { cn } from "@/lib/utils";
import { useFieldContext } from "@/components/form/Field";

export function RadioCardGroup<T extends string>({
  value,
  onChange,
  options,
  layout = "grid",
  "aria-label": ariaLabel,
}: {
  value: T | undefined;
  onChange: (v: T) => void;
  options: { value: T; label: string; description?: string }[];
  layout?: "grid" | "stack";
  "aria-label"?: string;
}) {
  const ctx = useFieldContext();
  return (
    <div
      role="radiogroup"
      aria-labelledby={ctx ? ctx.inputId.replace(/^field-/, "label-") : undefined}
      aria-label={ariaLabel}
      className={cn(
        layout === "grid" && "grid grid-cols-1 sm:grid-cols-2 gap-2.5",
        layout === "stack" && "flex flex-col gap-2.5"
      )}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-all",
              active
                ? "border-pasha-red bg-pasha-red/[0.04] ring-2 ring-pasha-red/15"
                : "border-pasha-line bg-white hover:border-pasha-ink/30"
            )}
          >
            <span
              className={cn(
                "text-sm font-medium",
                active ? "text-pasha-red" : "text-pasha-ink"
              )}
            >
              {opt.label}
            </span>
            {opt.description && (
              <span className="text-xs text-pasha-muted leading-relaxed">
                {opt.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function CheckboxGroup({
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: readonly string[];
  "aria-label"?: string;
}) {
  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };
  return (
    <div role="group" aria-label={ariaLabel} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            role="checkbox"
            aria-checked={active}
            onClick={() => toggle(opt)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left transition-all text-sm",
              active
                ? "border-pasha-red bg-pasha-red/[0.04] text-pasha-ink"
                : "border-pasha-line bg-white text-pasha-ink hover:border-pasha-ink/30"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded border transition-colors shrink-0",
                active ? "border-pasha-red bg-pasha-red" : "border-pasha-line"
              )}
            >
              {active && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 16 16" fill="none">
                  <path d="M3.5 8.5l3 3L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span>{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

export function YesNo({
  value,
  onChange,
  "aria-label": ariaLabel,
}: {
  value: boolean | undefined;
  onChange: (v: boolean) => void;
  "aria-label"?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel ?? "Yes or no"} className="flex gap-2.5">
      {[
        { v: true, label: "Yes" },
        { v: false, label: "No" },
      ].map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.v)}
            className={cn(
              "flex-1 sm:flex-none sm:px-8 rounded-lg border py-2.5 text-sm font-medium transition-all",
              active
                ? "border-pasha-red bg-pasha-red text-white"
                : "border-pasha-line bg-white text-pasha-ink hover:border-pasha-ink/30"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
