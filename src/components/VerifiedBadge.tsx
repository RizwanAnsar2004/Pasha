"use client";

import { BadgeCheck } from "lucide-react";

/**
 * "P@SHA verified" badge. Shown next to a startup name on the directory
 * listing and on the detail page.
 *
 * Hover/tap reveals a tooltip with a deliberately narrow framing:
 *   - "P@SHA has reviewed this profile in good faith."
 *   - The badge does NOT mean P@SHA has done due-diligence, audited the
 *     financials, or that P@SHA stands behind any of the company's claims.
 *
 * The legal framing is intentional — the committee should be able to put
 * a check mark next to a known company without taking on liability for
 * unverified statements made by that company. We surface this clearly in
 * the tooltip so users don't read the badge as endorsement.
 */
export function VerifiedBadge({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const iconSize =
    size === "lg" ? "w-5 h-5" : size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <span
      className={`inline-flex items-center text-pasha-red align-middle relative group/badge ${className ?? ""}`}
      // Native title gives the basic hover hint on every browser/device.
      // The custom tooltip below upgrades the desktop experience without
      // requiring JS state.
      title="P@SHA verified — see profile for what this means"
      aria-label="P@SHA verified"
      // Stop card-wide stretched links from swallowing the hover/tap.
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <BadgeCheck className={iconSize} aria-hidden />
      <span className="sr-only">P@SHA verified</span>

      {/* Tooltip — appears on hover/focus. Hidden on small screens; the
          native title attribute covers mobile via long-press.
          NOTE: explicit font-sans + tracking-normal so the tooltip doesn't
          inherit the parent heading's serif font + tight letter spacing,
          which squeezes the body copy and makes it hard to read. */}
      <span
        role="tooltip"
        className="pointer-events-none hidden md:block absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-[20rem] max-w-[calc(100vw-2rem)] rounded-lg border border-pasha-line bg-white px-4 py-3.5 text-left font-sans tracking-normal text-[13px] leading-[1.55] font-normal text-pasha-ink/85 shadow-lg opacity-0 group-hover/badge:opacity-100 group-focus-within/badge:opacity-100 transition-opacity"
      >
        <span className="block font-mono text-[10px] font-medium uppercase tracking-[2px] text-pasha-red">
          P@SHA verified
        </span>
        <span className="mt-1.5 block">
          P@SHA has reviewed this profile in good faith. The badge confirms that
          basic identifying details have been sighted — it is not a warranty of
          the company&apos;s claims, financials, performance, or compliance, and
          should not be read as due-diligence or endorsement.
        </span>
      </span>
    </span>
  );
}
