"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PillButton } from "@/components/landing/shared/PillButton";

// Landing page the applicant reaches after clicking the email-verification link.
export function VerifiedContent() {
  const sp = useSearchParams();
  const failed = sp.get("error") != null;

  // Celebrate a successful verification with the same confetti burst the submission-success page uses — only when the link actually worked.
  useEffect(() => {
    if (failed) return;
    let cancelled = false;
    let raf = 0;

    void import("canvas-confetti").then((mod) => {
      if (cancelled) return;
      const confetti = (
        "default" in mod && mod.default ? mod.default : mod
      ) as typeof import("canvas-confetti");
      const duration = 1800;
      const end = Date.now() + duration;
      const colors = ["#E6160F", "#FF3329", "#0E0E10", "#15803D"];

      (function frame() {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          startVelocity: 45,
          origin: { x: 0, y: 0.6 },
          colors,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          startVelocity: 45,
          origin: { x: 1, y: 0.6 },
          colors,
        });
        if (Date.now() < end) raf = requestAnimationFrame(frame);
      })();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [failed]);

  if (failed) {
    return (
      <>
        <SiteHeader />
        <main className="flex-1 bg-pasha-stone/30">
          <div className="mx-auto max-w-2xl px-4 sm:px-8 py-20 sm:py-28 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mx-auto w-14 h-14 rounded-2xl bg-pasha-red/10 grid place-items-center mb-7">
                <AlertCircle className="w-7 h-7 text-pasha-red" />
              </div>
              <h1 className="font-serif font-extrabold text-3xl sm:text-5xl tracking-tight text-pasha-ink text-balance">
                This link has expired.
              </h1>
              <p className="mt-5 text-lg text-pasha-muted max-w-lg mx-auto leading-relaxed text-pretty">
                Verification links are single-use and time out for your security.
                Head back to sign in and we&apos;ll send you a fresh one.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                <PillButton href="/apply/login" variant="solid" dot={false} arrow={false}>
                  <RefreshCw className="w-4 h-4" />
                  Back to sign in
                </PillButton>
              </div>
            </motion.div>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-pasha-stone/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-8 py-20 sm:py-28 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Big, unmistakable success mark — concentric green rings with an */}
            <div className="relative mx-auto mb-8 w-28 h-28 sm:w-32 sm:h-32">
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="absolute inset-0 rounded-full bg-green-600/10"
              />
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="absolute inset-3 rounded-full bg-green-600/15"
              />
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3, type: "spring", bounce: 0.5 }}
                className="absolute inset-6 rounded-full bg-green-600 grid place-items-center shadow-lg shadow-green-600/30"
              >
                <BadgeCheck className="w-9 h-9 sm:w-11 sm:h-11 text-white" strokeWidth={2.5} />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="inline-flex items-center gap-2 rounded-full border border-green-600/30 bg-green-600/10 px-4 py-1.5 mb-6"
            >
              <Sparkles className="w-3.5 h-3.5 text-green-700" />
              <span className="font-mono text-[11px] uppercase tracking-[2px] text-green-800">
                Verification complete
              </span>
            </motion.div>

            <h1 className="font-serif font-extrabold text-4xl sm:text-7xl tracking-tight text-pasha-ink text-balance">
              Email verified.
            </h1>
            <p className="mt-5 text-lg text-pasha-muted max-w-xl mx-auto leading-relaxed text-pretty">
              Your account is now active. Pick up right where you left off and
              complete your application whenever you&apos;re ready.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <PillButton href="/apply" variant="solid" dot={false}>
              Continue to your application
            </PillButton>
            <PillButton href="/directory" variant="outline" dot={false} arrow={false}>
              Browse the directory
            </PillButton>
          </motion.div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
