"use client";

import { createContext, useContext } from "react";
import { registerOtherOptionsFromRegistry } from "@/lib/options/choice";
import type { OptionItem } from "@/lib/options/types";

export type OptionRegistry = Record<string, OptionItem[]>;

// The resolved option-list registry (code + admin-managed DB lists) for the current form render.
const OptionListsContext = createContext<OptionRegistry>({});

export function OptionListsProvider({
  value,
  children,
}: {
  value: OptionRegistry;
  children: React.ReactNode;
}) {
  // Teach the isomorphic "Other" check which option ids stand for the sentinel.
  registerOtherOptionsFromRegistry(value);
  return <OptionListsContext.Provider value={value}>{children}</OptionListsContext.Provider>;
}

export function useOptionRegistry(): OptionRegistry {
  return useContext(OptionListsContext);
}

// Read one named list (e.g. "HQ_CITIES") from the registry.
export function useOptionList(
  name: string,
  fallback: readonly string[] | readonly OptionItem[] = []
): OptionItem[] {
  const registry = useContext(OptionListsContext);
  const fromDb = registry[name];
  if (fromDb?.length) return fromDb;
  return fallback.map((o) =>
    typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label }
  );
}
