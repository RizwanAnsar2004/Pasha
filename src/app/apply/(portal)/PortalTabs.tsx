"use client";

import { createContext, useContext, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormStepJumpContext, type FormStepJump } from "@/components/form/FormStepJump";

type Tab = "overview" | "form";

// Lets server-rendered overview children (passed in as nodes) switch to the form
// tab instantly instead of soft-navigating. An optional step jumps the form
// straight to that 0-based step index.
const PortalTabsContext = createContext<{ goToForm: (step?: number) => void } | null>(null);

export function usePortalTabs() {
  return useContext(PortalTabsContext);
}

// Client-side tab shell for the applicant portal. Overview and the application
export function PortalTabs({
  overview,
  form,
  formAvailable,
  initialTab,
}: {
  overview: React.ReactNode;
  // The application form node — omitted (null) once the draft is submitted.
  form: React.ReactNode;
  // False once submitted: only the overview tab exists.
  formAvailable: boolean;
  initialTab: Tab;
}) {
  const [tab, setTab] = useState<Tab>(
    formAvailable ? initialTab : "overview"
  );
  // Signal that tells the mounted DynamicForm to jump to a step. Bumped nonce so
  // requesting the same step twice still fires.
  const [stepJump, setStepJump] = useState<FormStepJump>(null);
  const nonceRef = useRef(0);

  const select = (next: Tab, step?: number) => {
    setTab(next);
    if (next === "form" && typeof step === "number") {
      setStepJump({ step, nonce: ++nonceRef.current });
    }
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
    <PortalTabsContext.Provider value={{ goToForm: (step?: number) => select("form", step) }}>
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
        {/* Both panels stay mounted; we only hide the inactive one so the form */}
        <div hidden={tab !== "overview"}>{overview}</div>

        {formAvailable && (
          <div hidden={tab !== "form"}>
            <div className="mb-6">
              {/* <button
                type="button"
                onClick={() => select("overview")}
                className="inline-flex items-center gap-1.5 text-sm text-pasha-muted hover:text-pasha-ink transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to overview
              </button> */}
              <h1 className="mt-3 font-serif text-2xl sm:text-3xl tracking-tight text-pasha-ink">
                Tell us about your startup
              </h1>
              <p className="mt-1.5 text-sm text-pasha-muted">
                A few quick steps. We auto-save your progress as you go.
              </p>
            </div>
            <FormStepJumpContext.Provider value={stepJump}>
              {form}
            </FormStepJumpContext.Provider>
          </div>
        )}
      </div>
    </PortalTabsContext.Provider>
  );
}
