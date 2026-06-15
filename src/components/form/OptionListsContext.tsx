"use client";

import { createContext, useContext } from "react";

export type OptionRegistry = Record<string, { value: string; label: string }[]>;

// The resolved option-list registry (code + admin-managed DB lists) for the
// current form render. Empty by default → resolveOptions() falls back to the
// code-only lists, so the form still works without a provider.
const OptionListsContext = createContext<OptionRegistry>({});

export function OptionListsProvider({
  value,
  children,
}: {
  value: OptionRegistry;
  children: React.ReactNode;
}) {
  return <OptionListsContext.Provider value={value}>{children}</OptionListsContext.Provider>;
}

export function useOptionRegistry(): OptionRegistry {
  return useContext(OptionListsContext);
}
