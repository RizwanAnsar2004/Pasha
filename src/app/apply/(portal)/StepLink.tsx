"use client";

import { ArrowRight } from "lucide-react";
import { usePortalTabs } from "./PortalTabs";

// "Review / Complete" action on an overview step card. The application is now a
// tab on this same page, not a separate route — so instead of navigating to
// /apply?tab=form&step=N we switch to the form tab and jump the mounted form to
// that step, entirely client-side.
export function StepLink({ step, label }: { step: number; label: string }) {
  const tabs = usePortalTabs();
  return (
    <button
      type="button"
      onClick={() => tabs?.goToForm(step)}
      className="mt-3 inline-flex items-center gap-1.5 text-sm text-pasha-red hover:text-pasha-red-dark font-medium"
    >
      {label}
      <ArrowRight className="w-3.5 h-3.5" />
    </button>
  );
}
