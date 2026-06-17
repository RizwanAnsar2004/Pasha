import {
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  type KeyboardEvent,
  type SelectHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";
import { useFieldContext } from "@/components/form/Field";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
  options: readonly string[] | { value: string; label: string }[];
}

const TYPEAHEAD_RESET_MS = 750;

const NAV_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Enter",
  "Tab",
  "Escape",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  " ",
]);

function findMatchingOption(
  opts: { value: string; label: string }[],
  query: string
) {
  if (!query) return undefined;
  const q = query.toLowerCase();
  return opts.find((o) => o.value && o.label.toLowerCase().startsWith(q));
}

function applySelectValue(select: HTMLSelectElement, value: string) {
  if (select.value === value) return;
  select.value = value;
  select.dispatchEvent(new Event("input", { bubbles: true }));
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      placeholder,
      options,
      id,
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
      defaultValue,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const ctx = useFieldContext();
    const finalId = id ?? ctx?.inputId;
    const describedBy =
      ariaDescribedBy ?? (ctx?.hasError ? ctx.errorId : ctx?.hintId);
    const opts = useMemo(
      () =>
        options.map((o) =>
          typeof o === "string" ? { value: o, label: o } : o
        ),
      [options]
    );
    const typeaheadRef = useRef({ buffer: "", timer: null as ReturnType<typeof setTimeout> | null });

    const resetTypeaheadBuffer = useCallback(() => {
      if (typeaheadRef.current.timer) clearTimeout(typeaheadRef.current.timer);
      typeaheadRef.current.timer = setTimeout(() => {
        typeaheadRef.current.buffer = "";
        typeaheadRef.current.timer = null;
      }, TYPEAHEAD_RESET_MS);
    }, []);

    const jumpToMatch = useCallback(
      (select: HTMLSelectElement, query: string) => {
        const match = findMatchingOption(opts, query);
        if (match) applySelectValue(select, match.value);
      },
      [opts]
    );

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLSelectElement>) => {
        onKeyDown?.(e);
        if (e.defaultPrevented || e.currentTarget.disabled) return;
        if (e.metaKey || e.ctrlKey || e.altKey || NAV_KEYS.has(e.key)) return;

        if (e.key === "Backspace") {
          typeaheadRef.current.buffer = typeaheadRef.current.buffer.slice(0, -1);
          resetTypeaheadBuffer();
          if (typeaheadRef.current.buffer) {
            e.preventDefault();
            jumpToMatch(e.currentTarget, typeaheadRef.current.buffer);
          }
          return;
        }

        if (e.key.length !== 1) return;

        e.preventDefault();
        typeaheadRef.current.buffer += e.key;
        resetTypeaheadBuffer();
        jumpToMatch(e.currentTarget, typeaheadRef.current.buffer);
      },
      [jumpToMatch, onKeyDown, resetTypeaheadBuffer]
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
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-11 w-full max-w-full box-border rounded-lg border border-pasha-line bg-white pl-3.5 pr-9 py-2 text-sm text-pasha-ink shadow-xs transition-colors focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15 disabled:cursor-not-allowed disabled:opacity-60 appearance-none",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled hidden>
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
