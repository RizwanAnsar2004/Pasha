"use client";

import { useState, useEffect, useRef } from "react";
import {
  FormProvider,
  useForm,
  type UseFormReturn,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Save, X } from "lucide-react";

import {
  submissionSchema,
  type SubmissionInput,
  stepTitles,
  stepFields,
} from "@/lib/schema";
import { labelFor } from "@/lib/field-labels";

// v2 draft key — bumping forces old v1 drafts to be ignored cleanly so users
// with stale 7-step drafts don't get hydrated into the new 3-step form with
// missing required fields.
const DRAFT_KEY = "pasha-apply-draft-v2";
const DRAFT_DEBOUNCE_MS = 1000;

import { Step1Startup } from "./steps/Step1Startup";
import { Step2Founders } from "./steps/Step2Founders";
import { Step3Recognition } from "./steps/Step3Recognition";
import { WizardStepper } from "./WizardStepper";

export type StepProps = {
  form: UseFormReturn<SubmissionInput>;
};

const TOTAL_STEPS = 3;

export function ApplyForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const draftRestoredOnce = useRef(false);

const form = useForm<SubmissionInput>({
    resolver: zodResolver(submissionSchema) as Resolver<SubmissionInput>,
    mode: "onTouched",
    defaultValues: {
      revenue_models: [],
      engagement_interests: [],
      whatsapp_optin: false,
      facebook_optin: false,
      outside_pakistan: false,
      // Empty-string defaults so every <select> with a placeholder ("Select…")
      // starts on the disabled placeholder option instead of the browser's
      // auto-pick of the first real option (Karachi / Artificial Intelligence /
      // Consumer Centric, etc.). The required ones (hq_city, primary_sector,
      // stage) also need this so validation can detect "nothing chosen".
      startup_name: "",
      tagline: "",
      website: "",
      year_founded: "",
      description: "",
      logo_url: "",
      hq_city: "",
      hq_other: "",
      hq_country: "",
      primary_sector: "",
      secondary_sector: "",
      business_model: "",
      stage: "",
      total_employees: "",
      female_employees: "",
      founding_team_composition: "",
      revenue_band: "",
      funding_stage: "",
      pitch_deck_url: "",
      pitch_video: "",
      nic_name: "",
      nic_cohort: "",
      nic_year: "",
      company_linkedin: "",
      company_x: "",
      company_instagram: "",
      company_facebook: "",
      company_youtube: "",
      patents_count: "",
      awards: "",
      certifications: "",
      closing_notes: "",
      founders: [
        {
          name: "",
          role: "",
          email: "",
          mobile: "",
          linkedin: "",
          x: "",
          instagram: "",
          facebook: "",
          custom_links: [],
          photo_url: "",
          gender: "",
          is_primary: true,
        },
      ],
    } as unknown as Partial<SubmissionInput>,
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch() is intentionally non-memoizable; this is the documented usage pattern
  const values = form.watch();

  // Hydrate from localStorage draft once on mount.
  useEffect(() => {
    if (draftRestoredOnce.current) return;
    draftRestoredOnce.current = true;
    try {
      const raw =
        typeof window !== "undefined" ? window.localStorage.getItem(DRAFT_KEY) : null;
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        savedAt?: number;
        values?: Partial<SubmissionInput>;
      };
      if (!draft?.values) return;
      const ageMs = Date.now() - (draft.savedAt ?? 0);
      if (ageMs > 30 * 24 * 60 * 60 * 1000) {
        window.localStorage.removeItem(DRAFT_KEY);
        return;
      }
      form.reset({
        ...form.getValues(),
        ...draft.values,
      });
      setDraftRestored(true);
    } catch {
      // Corrupted draft — ignore silently
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced autosave to localStorage on any change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handle = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ savedAt: Date.now(), values })
        );
      } catch {
        // Quota exceeded — ignore
      }
    }, DRAFT_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [values]);

  const clearDraft = () => {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setDraftRestored(false);
  };

  // Note: client-side live tier preview was removed. Vetting still runs
  // server-side in /api/submit; the user just doesn't see it pre-submit.

  const goNext = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (step >= TOTAL_STEPS) return;
    const fieldsForStep = stepFields[step] ?? [];
    const ok = await form.trigger(fieldsForStep);
    if (!ok) {
      const errs = form.formState.errors as Record<string, unknown>;
      const badFields = fieldsForStep
        .map((f) => f as string)
        .filter((f) => f in errs);
      const labels = badFields.map(labelFor).join(", ");
      const stepInfo = stepTitles[step - 1];
      setError(`Step ${step} (${stepInfo.title}) needs: ${labels}`);
      return;
    }
    setError(null);
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => {
    setError(null);
    if (step > 1) setStep(step - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Strip conditional sub-fields when their parent toggle is off so the DB
  // doesn't end up with orphan values (e.g. nic_year=2023 when the user later
  // toggled "incubated_in_nic" back to false).
  const cleanConditionalFields = (data: SubmissionInput): SubmissionInput => {
    const cleaned: SubmissionInput = { ...data };
    if (cleaned.incubated_in_nic !== true) {
      cleaned.nic_name = undefined;
      cleaned.nic_cohort = undefined;
      cleaned.nic_year = undefined;
    }
    if (cleaned.has_patents !== true) {
      cleaned.patents_count = undefined;
    }
    if (cleaned.raised_funding !== true) {
      cleaned.funding_stage = undefined;
    }
    // City vs country branches — only one is real per row.
    if (cleaned.outside_pakistan) {
      cleaned.hq_city = undefined;
      cleaned.hq_other = undefined;
    } else {
      cleaned.hq_country = undefined;
      if (cleaned.hq_city !== "Other") cleaned.hq_other = undefined;
    }
    return cleaned;
  };

  const onSubmit = async (raw: SubmissionInput) => {
    setError(null);
    setSubmitting(true);
    try {
      const data = cleanConditionalFields(raw);
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error ?? "Submission failed");
      }
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {}
      const params = new URLSearchParams({
        tier: result.tier ?? "listed",
        score: String(result.score ?? 0),
        id: result.id,
      });
      router.push(`/apply/success?${params.toString()}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Submission failed";
      setError(msg);
      setSubmitting(false);
    }
  };

  // Map any invalid field back to the step that owns it. With nested paths
  // like `founders.0.email`, RHF reports the root key `founders` in the
  // errors object — we treat that as belonging to Step 2.
  function topLevelField(path: string): string {
    const dot = path.indexOf(".");
    return dot === -1 ? path : path.slice(0, dot);
  }

  const onInvalid = (errs: Record<string, unknown>) => {
    const fields = Object.keys(errs).map(topLevelField);
    if (fields.length === 0) {
      setError("Submission failed. Please review the form.");
      return;
    }
    let firstBadStep = 1;
    let firstBadStepFields: string[] = [];
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      const stepFieldNames = (stepFields[i] ?? []) as string[];
      const overlap = stepFieldNames.filter((f) => fields.includes(f));
      if (overlap.length > 0) {
        firstBadStep = i;
        firstBadStepFields = overlap;
        break;
      }
    }
    const stepInfo = stepTitles[firstBadStep - 1];
    const labels = firstBadStepFields.map(labelFor).join(", ");
    setError(`Step ${firstBadStep} (${stepInfo.title}) needs: ${labels}`);
    if (step !== firstBadStep) {
      setStep(firstBadStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const stepInfo = stepTitles[step - 1];

  // Allow clicking on completed steps to go back (not forward)
  const handleStepClick = (target: number) => {
    if (target < step) {
      setStep(target);
      setError(null);
      window.scrollTo({ top: 200, behavior: "smooth" });
    }
  };

  return (
    <FormProvider {...form}>
      {/* ═══════════════════════════════════════════════════════
          Draft restored banner
          ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {draftRestored && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-pasha-red/20 bg-gradient-to-r from-pasha-red/[0.04] to-transparent px-4 py-3"
          >
            <div className="flex items-center gap-3 text-sm text-pasha-ink/80">
              <div className="w-8 h-8 rounded-lg bg-pasha-red/10 grid place-items-center shrink-0">
                <Save className="w-4 h-4 text-pasha-red" />
              </div>
              <p>
                Your previous draft has been restored — we auto-save your
                progress as you type.
              </p>
            </div>
            <button
              type="button"
              onClick={clearDraft}
              aria-label="Dismiss"
              className="rounded-lg p-1.5 text-pasha-muted hover:text-pasha-ink hover:bg-white transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════
          WIZARD STEPPER — beautiful 3-step indicator
          ═══════════════════════════════════════════════════════ */}
      <WizardStepper currentStep={step} onStepClick={handleStepClick} />

      {/* ═══════════════════════════════════════════════════════
          STEP CARD — content + navigation in one polished card
          ═══════════════════════════════════════════════════════ */}
      <div className="mt-6 rounded-2xl bg-white border border-pasha-line/70 shadow-[0_4px_16px_-4px_rgba(14,14,16,0.06)] overflow-hidden">
        {/* Step header */}
        <div className="px-6 sm:px-8 pt-7 pb-5 border-b border-pasha-line/60 bg-gradient-to-b from-pasha-stone/20 to-transparent">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[2px] text-pasha-red font-semibold">
            <span>Step {String(step).padStart(2, "0")} / 03</span>
            <span className="text-pasha-ink/20">·</span>
            <span className="text-pasha-muted font-normal">{stepInfo.title}</span>
          </div>
          <h2 className="mt-2 font-serif text-2xl sm:text-3xl tracking-tight text-pasha-ink leading-tight">
            {stepInfo.title}
          </h2>
          <p className="mt-1.5 text-sm text-pasha-muted leading-relaxed">
            {stepInfo.subtitle}
          </p>
        </div>

        {/* Step content. We deliberately do NOT bind form's onSubmit here. */}
        <form
          onSubmit={(e) => e.preventDefault()}
          noValidate
          className="px-6 sm:px-8 py-8"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-7"
            >
              {step === 1 && <Step1Startup form={form} />}
              {step === 2 && <Step2Founders form={form} />}
              {step === 3 && <Step3Recognition form={form} />}
            </motion.div>
          </AnimatePresence>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 rounded-xl border border-pasha-red/30 bg-pasha-red/[0.04] px-4 py-3 text-sm text-pasha-red"
            >
              {error}
            </motion.div>
          )}
        </form>

        {/* Navigation footer */}
        <div className="px-6 sm:px-8 py-5 border-t border-pasha-line/60 bg-pasha-stone/30 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goPrev}
            disabled={step === 1}
            className="inline-flex items-center gap-2 rounded-full border border-pasha-line bg-white px-4 py-2.5 text-sm font-medium text-pasha-ink hover:bg-pasha-stone/60 hover:border-pasha-ink/15 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {/* Helper text — visible only on mid+ screens */}
          <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-[1.5px] text-pasha-muted">
            {step < TOTAL_STEPS
              ? `${TOTAL_STEPS - step} step${TOTAL_STEPS - step === 1 ? "" : "s"} to go`
              : "Ready to submit"}
          </span>

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={goNext}
              className="group relative inline-flex items-center gap-2 rounded-full bg-pasha-ink px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-pasha-ink/15 hover:bg-pasha-red hover:shadow-pasha-red/30 hover:-translate-y-0.5 transition-all overflow-hidden"
            >
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-700"
              />
              <span className="relative">Continue</span>
              <ArrowRight className="relative w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (submitting) return;
                form.handleSubmit(onSubmit, onInvalid)();
              }}
              disabled={submitting}
              className="group relative inline-flex items-center gap-2 rounded-full bg-pasha-red px-7 py-3 text-sm font-medium text-white shadow-xl shadow-pasha-red/30 hover:bg-pasha-red-dark hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none overflow-hidden"
            >
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:translate-x-full transition-transform duration-700"
              />
              {submitting ? (
                <>
                  <Loader2 className="relative w-4 h-4 animate-spin" />
                  <span className="relative">Submitting…</span>
                </>
              ) : (
                <>
                  <span className="relative">Submit application</span>
                  <Check className="relative w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          BOTTOM HELP STRIP — replaces the sidebar
          ═══════════════════════════════════════════════════════ */}
      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-pasha-stone/40 to-transparent border border-pasha-line/70 p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-pasha-red/10 grid place-items-center shrink-0">
              <span className="text-pasha-red text-base">✦</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-pasha-ink">
                The more you share, the better
              </h4>
              <p className="mt-1.5 text-xs text-pasha-muted leading-relaxed">
                Profiles with complete information are far more likely to earn
                the Featured tier in the public directory.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-pasha-line/70 p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-pasha-ink/[0.04] grid place-items-center shrink-0">
              <span className="text-pasha-ink text-base">@</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-pasha-ink">Need help?</h4>
              <p className="mt-1.5 text-xs text-pasha-muted leading-relaxed">
                Email{" "}
                <a
                  href="mailto:startups@pasha.org.pk"
                  className="text-pasha-red hover:underline underline-offset-2 font-medium"
                >
                  startups@pasha.org.pk
                </a>{" "}
                with any questions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
