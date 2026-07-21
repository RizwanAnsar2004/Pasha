"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

// Copies the current page URL to the clipboard. Falls back to no-op if the
export function ShareProfileButton({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — silently ignore.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={
        className ??
        "inline-flex items-center gap-3 rounded-2xl border border-white/18 bg-white/[0.06] px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-white hover:text-pasha-ink"
      }
    >
      {copied ? <Check className="h-[18px] w-[18px]" /> : <Share2 className="h-[18px] w-[18px]" />}
      {copied ? "Link copied" : "Share profile"}
    </button>
  );
}
