"use client";

import { ArrowRight } from "lucide-react";
import { usePortalTabs } from "./PortalTabs";

// The overview's "Start / Continue / Edit application" CTA. Switches to
// Drops to `secondary` once the application is ready to send, so "Submit for
// approval" is the only red button in the row.
export function StartApplicationButton({
  label,
  variant = "primary",
}: {
  label: string;
  variant?: "primary" | "secondary";
}) {
  const tabs = usePortalTabs();
  return (
    <button
      type="button"
      onClick={() => tabs?.goToForm()}
      className={
        "group inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all " +
        (variant === "primary"
          ? "bg-pasha-red text-white shadow-md hover:bg-pasha-red-dark"
          : "border border-pasha-line bg-white text-pasha-ink hover:bg-pasha-stone/60 hover:border-pasha-ink/15")
      }
    >
      {label}
      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
