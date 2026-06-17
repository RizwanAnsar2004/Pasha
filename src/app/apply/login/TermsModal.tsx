"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const TERMS = [
  {
    heading: "1. Acceptance of terms",
    body: "By creating an account on the P@SHA Startup Community portal you confirm that you have read, understood and agree to be bound by these terms. If you are registering on behalf of a company, you confirm you are authorised to do so.",
  },
  {
    heading: "2. Account & eligibility",
    body: "Accounts are intended for founders, employees, or authorised representatives of a registered or prospective Pakistani technology startup. You agree to provide accurate information and keep your contact details up to date so the committee can reach you.",
  },
  {
    heading: "3. Use of the platform",
    body: "You may use the portal to submit your application, manage your public directory listing, and engage with P@SHA programmes. You agree not to misuse the platform, attempt to access other applicants' data, upload unlawful or infringing content, or interfere with the service.",
  },
  {
    heading: "4. Data we collect",
    body: "We collect the information you provide in your application (company, founders, funding, documents) plus standard technical metadata (IP, device, timestamps). Uploaded documents (pitch deck, CNIC/passport, registration certificates) are stored privately and shared only with the committee.",
  },
  {
    heading: "5. How we use it",
    body: "Your application is used to (a) verify eligibility, (b) compute vetting tiers, (c) display approved listings on the public directory, and (d) inform you of relevant P@SHA events and opportunities. Personally identifying documents are never published.",
  },
  {
    heading: "6. Public directory",
    body: "Once approved, selected fields (startup name, tagline, sector, city, website, public socials, founders' public profiles) appear on the public P@SHA directory. You can request removal at any time by emailing startups@pasha.org.pk.",
  },
  {
    heading: "7. Sharing with third parties",
    body: "We do not sell your data. We may share aggregated, non-identifying statistics with partners and sponsors. Individual data is shared only with your consent or as required by law.",
  },
  {
    heading: "8. Your rights",
    body: "You can access, correct, export, or delete your data at any time from the applicant dashboard or by contacting us. Deleting your account removes your directory listing and severs further committee communication.",
  },
  {
    heading: "9. Changes to this agreement",
    body: "We may update these terms from time to time. Material changes will be communicated by email and will require renewed consent before continued use of the portal.",
  },
  {
    heading: "10. Contact",
    body: "For questions about this agreement or your data, contact the P@SHA team at startups@pasha.org.pk. This is a placeholder agreement — final legal text will be issued by P@SHA legal counsel before launch.",
  },
];

export function TermsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
              P@SHA Startup Community — Terms
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
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-sm leading-relaxed text-pasha-ink">
          <p className="text-xs text-pasha-muted italic">
            Draft for review — the binding version will be issued by P@SHA legal counsel.
          </p>
          {TERMS.map((t) => (
            <section key={t.heading}>
              <h3 className="font-medium text-pasha-ink">{t.heading}</h3>
              <p className="mt-1 text-pasha-ink/80">{t.body}</p>
            </section>
          ))}
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
