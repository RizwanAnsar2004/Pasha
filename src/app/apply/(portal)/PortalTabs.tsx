"use client";

import { createContext, useContext, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "overview" | "form";

// Lets server-rendered overview children (passed in as nodes) switch to the
// form tab instantly instead of soft-navigating. A client child anywhere in the
// overview subtree can call `usePortalTabs().goToForm()`.
const PortalTabsContext = createContext<{ goToForm: () => void } | null>(null);

export function usePortalTabs() {
  return useContext(PortalTabsContext);
}

/**
 * Client-side tab shell for the applicant portal. Overview and the application
 * form are both rendered on the server and passed in as nodes; this component
 * just toggles which one is visible with local state, so switching tabs is
 * instant (no server navigation) and the form keeps its in-progress state while
 * the applicant peeks at the overview.
 *
 * Replaces the old two-route split (/apply + /apply/form), where each tab click
 * was a full server round-trip that re-fetched the same form config, draft and
 * option lists.
 */
export function PortalTabs({
  overview,
  form,
  formAvailable,
  initialTab,
}: {
  overview: React.ReactNode;
  /** The application form node — omitted (null) once the draft is submitted. */
  form: React.ReactNode;
  /** False once submitted: only the overview tab exists. */
  formAvailable: boolean;
  initialTab: Tab;
}) {
  const [tab, setTab] = useState<Tab>(
    formAvailable ? initialTab : "overview"
  );

  const select = (next: Tab) => {
    setTab(next);
    // Keep the URL shareable/refresh-safe without a server round-trip.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (next === "form") url.searchParams.set("tab", "form");
      else url.searchParams.delete("tab");
      url.searchParams.delete("step");
      window.history.replaceState(null, "", url);
    }
  };

  const tabs: { key: Tab; label: string }[] = formAvailable
    ? [
        { key: "overview", label: "Overview" },
        { key: "form", label: "My application" },
      ]
    : [{ key: "overview", label: "Overview" }];

  return (
    <PortalTabsContext.Provider value={{ goToForm: () => select("form") }}>
      <nav className="flex items-center gap-1 border-b border-pasha-line">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => select(t.key)}
              className={cn(
                "relative px-4 py-3 text-sm transition-colors",
                active
                  ? "text-pasha-ink font-medium"
                  : "text-pasha-muted hover:text-pasha-ink"
              )}
            >
              {t.label}
              {active && (
                <span className="absolute inset-x-0 -bottom-px h-[2px] bg-pasha-red rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-6">
        {/* Both panels stay mounted; we only hide the inactive one so the form
            preserves its state and switching is instant. */}
        <div hidden={tab !== "overview"}>{overview}</div>

        {formAvailable && (
          <div hidden={tab !== "form"}>
            <div className="mb-6">
              <button
                type="button"
                onClick={() => select("overview")}
                className="inline-flex items-center gap-1.5 text-sm text-pasha-muted hover:text-pasha-ink transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to overview
              </button>
              <h1 className="mt-3 font-serif text-2xl sm:text-3xl tracking-tight text-pasha-ink">
                Tell us about your startup
              </h1>
              <p className="mt-1.5 text-sm text-pasha-muted">
                A few quick steps. We auto-save your progress as you go.
              </p>
            </div>
            {form}
          </div>
        )}
      </div>
    </PortalTabsContext.Provider>
  );
}
