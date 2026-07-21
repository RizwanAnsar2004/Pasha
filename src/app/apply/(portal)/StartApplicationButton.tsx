"use client";

import { ArrowRight } from "lucide-react";
import { usePortalTabs } from "./PortalTabs";

// The overview's primary "Start / Continue / Edit application" CTA. Switches to
export function StartApplicationButton({ label }: { label: string }) {
  const tabs = usePortalTabs();
  return (
    <button
      type="button"
      onClick={() => tabs?.goToForm()}
      className="group inline-flex items-center gap-2 rounded-full bg-pasha-red px-5 py-2.5 text-sm font-medium text-white shadow-md hover:bg-pasha-red-dark transition-all"
    >
      {label}
      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
