"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const iconSize =
    size === "lg"
      ? "w-5 h-5"
      : size === "sm"
      ? "w-3.5 h-3.5"
      : "w-4 h-4";

  const badgeRef = useRef<HTMLSpanElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!showTooltip || !badgeRef.current) return;

    const rect = badgeRef.current.getBoundingClientRect();

    setPosition({
      left: rect.left + rect.width / 2,
      top: rect.bottom + 8,
    });
  }, [showTooltip]);

  return (
    <>
      <span
        ref={badgeRef}
        className={`inline-flex shrink-0 items-center justify-center leading-none ${className ?? ""}`}
        title="P@SHA verified — see profile for what this means"
        aria-label="P@SHA verified"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
      >
        <BadgeCheck
          className={`${iconSize} text-pasha-red`}
          aria-hidden="true"
        />

        <span className="sr-only">P@SHA verified</span>
      </span>

      {showTooltip &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-[999999] -translate-x-1/2 rounded-lg border border-pasha-line bg-white px-4 py-3 shadow-2xl"
            style={{
              left: position.left,
              top: position.top,
            }}
          >
            <span className="block font-mono text-[10px] font-medium uppercase tracking-[2px] text-pasha-red">
              P@SHA VERIFIED
            </span>

            {/* Uncomment if you want the description */}
            {/*
            <span className="mt-2 block max-w-xs font-sans text-[13px] leading-[1.55] tracking-normal text-pasha-ink/85">
              P@SHA has reviewed this profile in good faith. The badge confirms
              that basic identifying details have been sighted — it is not a
              warranty of the company's claims, financials, performance, or
              compliance, and should not be read as due-diligence or endorsement.
            </span>
            */}
          </div>,
          document.body
        )}
    </>
  );
}