"use client";

import { useMemo, useState } from "react";
import * as RSelect from "@radix-ui/react-select";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectMenuOption = { value: string; label: string };

interface SelectMenuProps {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly (string | SelectMenuOption)[];
  placeholder?: string;
  /** Show an in-menu search box. Auto-enables for long lists when undefined. */
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  /** Trigger id, so a <label htmlFor> can point at it (Field integration). */
  id?: string;
  onBlur?: () => void;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

function normalize(
  options: readonly (string | SelectMenuOption)[]
): SelectMenuOption[] {
  return options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
}

/**
 * Radix-powered select with optional fuzzy search — the React-native
 * replacement for jQuery Select2. Same controlled value/onValueChange API
 * as a native <select>, but styled, accessible, and searchable.
 */
export function SelectMenu({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  searchable,
  disabled,
  className,
  id,
  onBlur,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: SelectMenuProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const opts = useMemo(() => normalize(options), [options]);
  const showSearch = searchable ?? opts.length > 8;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return opts;
    // Match on label OR value so codes and display names both resolve.
    return opts.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [opts, query]);

  return (
    <RSelect.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          onBlur?.();
        }
      }}
    >
      <RSelect.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        className={cn(
          "inline-flex h-10 items-center justify-between gap-2 rounded-lg border border-pasha-line bg-white px-3 text-sm text-pasha-ink",
          "focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15",
          "data-[placeholder]:text-pasha-muted disabled:cursor-not-allowed disabled:opacity-60",
          "aria-[invalid=true]:border-pasha-red aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-pasha-red/15",
          className
        )}
      >
        <RSelect.Value placeholder={placeholder} />
        <RSelect.Icon>
          <ChevronDown className="h-4 w-4 text-pasha-muted" />
        </RSelect.Icon>
      </RSelect.Trigger>

      <RSelect.Portal>
        <RSelect.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] max-w-[min(20rem,var(--radix-select-content-available-width))] overflow-hidden rounded-lg border border-pasha-line bg-white shadow-lg"
        >
          {showSearch && (
            <div className="flex items-center gap-2 border-b border-pasha-line px-2.5 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-pasha-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                // Stop Radix's built-in typeahead from hijacking keystrokes.
                onKeyDown={(e) => {
                  e.stopPropagation();
                  // Enter selects the first (top) match, so keyboard users
                  // don't have to reach for the mouse.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (filtered.length > 0) {
                      onValueChange(filtered[0].value);
                      setOpen(false);
                    }
                  }
                }}
                placeholder="Search…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-pasha-muted"
              />
            </div>
          )}
          <RSelect.Viewport className="max-h-72 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-pasha-muted">No matches</div>
            ) : (
              filtered.map((o) => (
                <RSelect.Item
                  key={o.value}
                  value={o.value}
                  title={o.label}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-3 pr-8 text-sm text-pasha-ink outline-none",
                    "[&_span]:truncate",
                    "data-[highlighted]:bg-pasha-stone/70 data-[state=checked]:font-medium"
                  )}
                >
                  <RSelect.ItemText>{o.label}</RSelect.ItemText>
                  <RSelect.ItemIndicator className="absolute right-2.5">
                    <Check className="h-4 w-4 text-pasha-red" />
                  </RSelect.ItemIndicator>
                </RSelect.Item>
              ))
            )}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
}
