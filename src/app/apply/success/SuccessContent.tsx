"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Mail, CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PillButton } from "@/components/landing/shared/PillButton";
import { funnel } from "@/lib/analytics";

export function SuccessContent() {
  const searchParams = useSearchParams();

  // Landing here means the submission succeeded — fire the funnel end event
  // once, with the server-assigned tier/score carried in the URL.
  useEffect(() => {
    const tier = searchParams.get("tier") ?? undefined;
    const scoreRaw = searchParams.get("score");
    const score = scoreRaw != null ? Number(scoreRaw) : undefined;
    funnel.submitted({ tier, score: Number.isFinite(score) ? score : undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
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
  }, []);

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
            <div className="inline-flex items-center gap-2 rounded-full border border-pasha-line bg-white px-4 py-1.5 mb-8">
              <Sparkles className="w-3.5 h-3.5 text-pasha-red" />
              <span className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-ink/80">
                Application submitted
              </span>
            </div>
            <h1 className="font-serif font-extrabold text-3xl sm:text-6xl tracking-tight text-pasha-ink text-balance">
              Thank you for applying.
            </h1>
            <p className="mt-5 text-lg text-pasha-muted max-w-xl mx-auto leading-relaxed text-pretty">
              We&apos;ve received your submission. The P@SHA committee reviews
              applications weekly — you&apos;ll hear back by email once
              your profile has been approved for the public directory.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-12 mx-auto max-w-md"
          >
            <div className="rounded-2xl border border-pasha-line bg-white p-6 sm:p-7 text-left">
              <h3 className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-red">
                What happens next
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-pasha-ink/85 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2
                    className="w-4 h-4 mt-0.5 shrink-0 text-pasha-red"
                    aria-hidden
                  />
                  <span>
                    Our committee reviews each submission by hand. Reviews
                    happen weekly.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2
                    className="w-4 h-4 mt-0.5 shrink-0 text-pasha-red"
                    aria-hidden
                  />
                  <span>
                    You&apos;ll receive an email once your profile is approved
                    and live on the directory.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2
                    className="w-4 h-4 mt-0.5 shrink-0 text-pasha-red"
                    aria-hidden
                  />
                  <span>
                    If anything needs clarification we&apos;ll reach out from
                    startups@pasha.org.pk — please add it to your contacts.
                  </span>
                </li>
              </ul>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <PillButton href="/directory" variant="solid" dot={false}>
              Browse the directory
            </PillButton>
            <PillButton href="mailto:startups@pasha.org.pk" variant="outline" dot={false} arrow={false}>
              <Mail className="w-4 h-4" />
              startups@pasha.org.pk
            </PillButton>
          </motion.div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
