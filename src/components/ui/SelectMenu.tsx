"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
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
  // Show an in-menu search box. Auto-enables for long lists when undefined.
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  // Trigger id, so a <label htmlFor> can point at it (Field integration).
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

// Touch devices need different open behaviour from mouse ones: no autofocus
// (which summons the keyboard) and a modal popover (so a scroll gesture can't
// be read as an outside interaction). useSyncExternalStore keeps this SSR-safe
// and avoids a setState-in-effect pass.
const COARSE_QUERY = "(pointer: coarse)";

// How far a pointer may travel between down and up and still count as a tap
// rather than the start of a scroll.
const TAP_SLOP_PX = 8;

function subscribeCoarse(cb: () => void) {
  const mq = window.matchMedia(COARSE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribeCoarse,
    () => window.matchMedia(COARSE_QUERY).matches,
    () => false
  );
}

// Styled, accessible select — the React-native replacement for jQuery Select2.
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

// ------------------------------------------------------------------
// Non-searchable: Radix Select
// ------------------------------------------------------------------

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
        <span className="truncate">
          <RSelect.Value placeholder={placeholder} />
        </span>
        <RSelect.Icon asChild>
          <ChevronDown className="h-4 w-4 shrink-0 text-pasha-muted" />
        </RSelect.Icon>
      </RSelect.Trigger>

      <RSelect.Portal>
        <RSelect.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] max-w-[min(28rem,var(--radix-select-content-available-width))] overflow-hidden rounded-lg border border-pasha-line bg-white shadow-lg"
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

// ------------------------------------------------------------------
// Searchable: Popover combobox
// ------------------------------------------------------------------

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
  const isTouch = useCoarsePointer();
  // Where a press started, so a drag can be told apart from a tap.
  const pressRef = useRef<{ x: number; y: number; value: string } | null>(null);

  const selected = opts.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return opts;
    // Match on label OR value so codes and display names both resolve.
    return opts.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [opts, query]);

  // Keep the highlighted row in range as the filter narrows. Clamped during
  // render rather than in an effect, which would cost a second render pass.
  const activeIndex = Math.min(active, Math.max(0, filtered.length - 1));

  const commit = (v: string) => {
    onValueChange(v);
    setOpen(false);
  };

  return (
    <RPopover.Root
      // Modal on touch: locks body scroll while open, so a scroll gesture can't
      // register as a pointerdown-outside and dismiss the menu mid-browse.
      modal={isTouch}
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
          // Focus the search box on open without Radix stealing it back — but
          // never on touch, where focusing raises the on-screen keyboard and
          // iOS zooms into the field, hiding the very list being opened. Touch
          // users tap the search box when they actually want to type.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            if (!isTouch) inputRef.current?.focus();
          }}
          // Size to the widest option rather than to the trigger: filter triggers are short ("All sectors") while their options are not ("Artificial.
          className="z-50 flex max-h-[var(--radix-popover-content-available-height)] min-w-[var(--radix-popover-trigger-width)] max-w-[min(28rem,var(--radix-popover-content-available-width))] flex-col overflow-hidden rounded-lg border border-pasha-line bg-white shadow-lg"
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
                  setActive(Math.min(activeIndex + 1, filtered.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive(Math.max(activeIndex - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered[activeIndex]) commit(filtered[activeIndex].value);
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              placeholder="Search…"
              aria-label="Search options"
              // 16px on mobile: iOS Safari zooms the viewport whenever a
              // focused input's font-size is below that. sm: restores 14px.
              className="w-full bg-transparent text-base sm:text-sm outline-none placeholder:text-pasha-muted"
            />
          </div>

          <div ref={listRef} className="max-h-72 overflow-y-auto overscroll-contain p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-pasha-muted">No matches</div>
            ) : (
              filtered.map((o, i) => {
                const isSelected = o.value === value;
                const isActive = i === activeIndex;
                return (
                  <div
                    key={o.value}
                    role="option"
                    aria-selected={isSelected}
                    title={o.label}
                    onPointerEnter={() => setActive(i)}
                    // Commit on pointer *up*, and only when the pointer barely
                    // moved. Committing on pointerdown (the old behaviour) meant
                    // the first touch of a scroll gesture instantly selected
                    // whatever row was under the finger and closed the menu.
                    //
                    // preventDefault on pointerdown keeps focus on the search
                    // input for mouse users (its blur would close the popover),
                    // but is skipped on touch where it can also cancel panning.
                    onPointerDown={(e) => {
                      if (!isTouch) e.preventDefault();
                      pressRef.current = { x: e.clientX, y: e.clientY, value: o.value };
                    }}
                    onPointerUp={(e) => {
                      const press = pressRef.current;
                      pressRef.current = null;
                      if (!press || press.value !== o.value) return;
                      const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y);
                      if (moved > TAP_SLOP_PX) return; // a scroll, not a tap
                      commit(o.value);
                    }}
                    onPointerCancel={() => {
                      pressRef.current = null;
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

// ------------------------------------------------------------------
// Shared styling
// ------------------------------------------------------------------

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
