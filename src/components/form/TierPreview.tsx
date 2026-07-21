"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import type { VettingResult } from "@/lib/startups/vetting/vetting";
import { tierLabel } from "@/lib/startups/vetting/vetting";

export function TierPreview({ result }: { result: VettingResult | null }) {
  if (!result) return null;
  const tier = result.tier;
  const tone =
    tier === "featured"
      ? "border-tier-featured/30 bg-tier-featured/[0.06] text-tier-featured"
      : tier === "listed"
      ? "border-tier-listed/30 bg-tier-listed/[0.06] text-tier-listed"
      : tier === "watchlist"
      ? "border-tier-watchlist/30 bg-tier-watchlist/[0.06] text-tier-watchlist"
      : "border-pasha-line bg-pasha-stone/40 text-pasha-muted";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tier}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className={`rounded-2xl border p-5 ${tone}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[2px] opacity-70">
              Tentative tier
            </span>
            <h4 className="mt-1 text-2xl font-serif tracking-tight">
              {tierLabel(tier)}
            </h4>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium border">
            {result.score} / 50
          </span>
        </div>
        <p className="mt-3 text-xs leading-relaxed opacity-80">
          Live preview based on what you&apos;ve entered. Final tier confirmed by the
          committee after review.
        </p>
        {!result.passes_gates && (
          <div className="mt-3 text-xs flex items-start gap-1.5 opacity-90">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Missing required fields: {result.gate_failures.join(", ")}
            </span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
