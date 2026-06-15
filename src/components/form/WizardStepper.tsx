"use client";

import { motion } from "framer-motion";
import { Check, Building2, Users, Award } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { num: 1, label: "Startup", description: "Company basics & metrics", icon: Building2 },
  { num: 2, label: "Founders", description: "Who's behind the product", icon: Users },
  { num: 3, label: "Recognition", description: "Awards & extra signals", icon: Award },
];

export function WizardStepper({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick?: (step: number) => void;
}) {
  return (
    <div className="rounded-2xl bg-white border border-pasha-line/70 p-5 sm:p-6 shadow-[0_4px_16px_-4px_rgba(14,14,16,0.06)]">
      <div className="relative grid grid-cols-3 gap-2 sm:gap-4">
        {/* Connecting line behind circles */}
        <div
          aria-hidden
          className="absolute top-6 sm:top-7 left-[16.67%] right-[16.67%] h-[2px] bg-pasha-line rounded-full"
        />
        {/* Active progress line */}
        <motion.div
          aria-hidden
          className="absolute top-6 sm:top-7 left-[16.67%] h-[2px] bg-gradient-to-r from-pasha-red to-pasha-red-light rounded-full"
          initial={false}
          animate={{
            width: `${((currentStep - 1) / 2) * 66.67}%`,
          }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />

        {STEPS.map((step) => {
          const isComplete = currentStep > step.num;
          const isActive = currentStep === step.num;
          const isPending = currentStep < step.num;

          return (
            <button
              key={step.num}
              type="button"
              onClick={() => onStepClick?.(step.num)}
              disabled={isPending && !onStepClick}
              className="group relative flex flex-col items-center text-center disabled:cursor-not-allowed"
            >
              {/* Circle */}
              <motion.div
                animate={{
                  scale: isActive ? 1.05 : 1,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={cn(
                  "relative w-12 h-12 sm:w-14 sm:h-14 rounded-full grid place-items-center transition-all duration-300 z-10",
                  isComplete && "bg-pasha-red text-white shadow-lg shadow-pasha-red/30",
                  isActive &&
                    "bg-white border-2 border-pasha-red text-pasha-red shadow-lg shadow-pasha-red/15 ring-4 ring-pasha-red/10",
                  isPending && "bg-pasha-stone border border-pasha-line text-pasha-muted"
                )}
              >
                {/* Pulsing ring on active */}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-pasha-red/20 animate-ping-soft"
                  />
                )}

                {isComplete ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  >
                    <Check className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
                  </motion.div>
                ) : (
                  <step.icon
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    strokeWidth={1.75}
                  />
                )}
              </motion.div>

              {/* Step number above circle (only on active/complete) */}
              <span
                className={cn(
                  "absolute -top-2 right-[28%] sm:right-[25%] font-mono text-[9px] uppercase tracking-[1.5px] px-1.5 py-0.5 rounded-full transition-all duration-300",
                  isComplete && "bg-pasha-red/10 text-pasha-red font-semibold",
                  isActive && "bg-pasha-red text-white font-semibold",
                  isPending && "bg-pasha-line/50 text-pasha-muted/70"
                )}
              >
                {String(step.num).padStart(2, "0")}
              </span>

              {/* Label + description */}
              <div className="mt-3">
                <div
                  className={cn(
                    "text-[13px] sm:text-sm font-semibold leading-tight transition-colors duration-300",
                    (isComplete || isActive) ? "text-pasha-ink" : "text-pasha-muted"
                  )}
                >
                  {step.label}
                </div>
                <div className="hidden sm:block mt-1 text-[11px] text-pasha-muted leading-tight">
                  {step.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
