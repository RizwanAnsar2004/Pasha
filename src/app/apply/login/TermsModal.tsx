"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { RichText } from "@/components/ui/RichText";
import { DEFAULT_SITE_CONTENT } from "@/lib/content/site-content";

export function TermsModal({
  open,
  onClose,
  title,
  body,
}: {
  open: boolean;
  onClose: () => void;
  // Admin-editable content (from site_content). Falls back to the built-in default.
  title?: string;
  body?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-modal-title"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-pasha-ink/40 backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
          >
        <div className="flex items-start justify-between gap-4 border-b border-pasha-line px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-red">
              Privacy & data-usage agreement
            </p>
            <h2
              id="terms-modal-title"
              className="mt-1 font-serif text-xl tracking-tight text-pasha-ink"
            >
              {title || DEFAULT_SITE_CONTENT.privacy_policy.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-pasha-muted hover:bg-pasha-stone/60 hover:text-pasha-ink transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-pasha-ink">
          <RichText
            value={body || DEFAULT_SITE_CONTENT.privacy_policy.body}
            className="rich-text space-y-4 [&_h3]:font-medium [&_h3]:text-pasha-ink [&_h3]:mt-4 [&_p]:text-pasha-ink/80"
          />
        </div>
        <div className="flex justify-end border-t border-pasha-line px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-full bg-pasha-ink px-4 py-2 text-sm font-medium text-white hover:bg-pasha-red transition-colors"
          >
            Close
          </button>
        </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
