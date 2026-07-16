"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as RSelect from "@radix-ui/react-select";
import * as RPopover from "@radix-ui/react-popover";
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
 * Styled, accessible select — the React-native replacement for jQuery Select2.
 *
 * Two implementations behind one API:
 *  - Non-searchable: Radix Select (native-like, ideal for short lists).
 *  - Searchable: a Popover-based combobox. Radix Select cannot host a focusable
 *    text input on mobile — focusing it opens the Android keyboard, which
 *    resizes the viewport and Radix Select reads that (plus the resulting
 *    scroll) as "interact outside" and dismisses. Popover has none of those
 *    dismiss triggers, so the search box and scrolling behave on Android/iOS.
 */
export function SelectMenu(props: SelectMenuProps) {
  const opts = useMemo(() => normalize(props.options), [props.options]);
  const showSearch = props.searchable ?? opts.length > 8;
  return showSearch ? (
    <SearchableSelect {...props} opts={opts} />
  ) : (
    <PlainSelect {...props} opts={opts} />
  );
}

type InnerProps = SelectMenuProps & { opts: SelectMenuOption[] };

/* ------------------------------------------------------------------ */
/* Non-searchable: Radix Select                                        */
/* ------------------------------------------------------------------ */

function PlainSelect({
  value,
  onValueChange,
  opts,
  placeholder = "Select…",
  disabled,
  className,
  id,
  onBlur,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: InnerProps) {
  return (
    <RSelect.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      onOpenChange={(next) => {
        if (!next) onBlur?.();
      }}
    >
      <RSelect.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        className={triggerClass(className)}
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
          <RSelect.Viewport className="max-h-72 overflow-y-auto p-1">
            {opts.map((o) => (
              <RSelect.Item
                key={o.value}
                value={o.value}
                title={o.label}
                className={itemClass}
              >
                <RSelect.ItemText>{o.label}</RSelect.ItemText>
                <RSelect.ItemIndicator className="absolute right-2.5">
                  <Check className="h-4 w-4 text-pasha-red" />
                </RSelect.ItemIndicator>
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
}

/* ------------------------------------------------------------------ */
/* Searchable: Popover combobox                                        */
/* ------------------------------------------------------------------ */

function SearchableSelect({
  value,
  onValueChange,
  opts,
  placeholder = "Select…",
  disabled,
  className,
  id,
  onBlur,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: InnerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = opts.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return opts;
    // Match on label OR value so codes and display names both resolve.
    return opts.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [opts, query]);

  // Keep the highlighted row in range as the filter narrows.
  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  const commit = (v: string) => {
    onValueChange(v);
    setOpen(false);
  };

  return (
    <RPopover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery("");
          setActive(0);
        } else {
          onBlur?.();
        }
      }}
    >
      <RPopover.Trigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          data-placeholder={selected ? undefined : ""}
          className={triggerClass(className)}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-pasha-muted" />
        </button>
      </RPopover.Trigger>

      <RPopover.Portal>
        <RPopover.Content
          role="listbox"
          sideOffset={4}
          align="start"
          avoidCollisions
          collisionPadding={8}
          // Focus the search box on open without Radix stealing it back.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
          className="z-50 flex max-h-[var(--radix-popover-content-available-height)] w-[var(--radix-popover-trigger-width)] max-w-[min(20rem,var(--radix-popover-content-available-width))] flex-col overflow-hidden rounded-lg border border-pasha-line bg-white shadow-lg"
        >
          <div className="flex items-center gap-2 border-b border-pasha-line px-2.5 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-pasha-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, filtered.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered[active]) commit(filtered[active].value);
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              placeholder="Search…"
              aria-label="Search options"
              className="w-full bg-transparent text-sm outline-none placeholder:text-pasha-muted"
            />
          </div>

          <div ref={listRef} className="max-h-72 overflow-y-auto overscroll-contain p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-pasha-muted">No matches</div>
            ) : (
              filtered.map((o, i) => {
                const isSelected = o.value === value;
                const isActive = i === active;
                return (
                  <div
                    key={o.value}
                    role="option"
                    aria-selected={isSelected}
                    title={o.label}
                    onPointerEnter={() => setActive(i)}
                    // Select on pointerdown so the tap lands before the input's
                    // blur can close the popover on mobile.
                    onPointerDown={(e) => {
                      e.preventDefault();
                      commit(o.value);
                    }}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-3 pr-8 text-sm text-pasha-ink outline-none",
                      "[&_span]:truncate",
                      isActive && "bg-pasha-stone/70",
                      isSelected && "font-medium"
                    )}
                  >
                    <span>{o.label}</span>
                    {isSelected && (
                      <span className="absolute right-2.5">
                        <Check className="h-4 w-4 text-pasha-red" />
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}

/* ------------------------------------------------------------------ */
/* Shared styling                                                      */
/* ------------------------------------------------------------------ */

function triggerClass(className?: string) {
  return cn(
    "inline-flex h-10 items-center justify-between gap-2 rounded-lg border border-pasha-line bg-white px-3 text-sm text-pasha-ink",
    "focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15",
    "data-[placeholder]:text-pasha-muted disabled:cursor-not-allowed disabled:opacity-60",
    "aria-[invalid=true]:border-pasha-red aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-pasha-red/15",
    className
  );
}

const itemClass = cn(
  "relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-3 pr-8 text-sm text-pasha-ink outline-none",
  "[&_span]:truncate",
  "data-[highlighted]:bg-pasha-stone/70 data-[state=checked]:font-medium"
);
