"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Save, X } from "lucide-react";

import {
  buildZodSchema,
  buildDefaultValues,
  stepsOf,
  stepTitlesOf,
  sectionsForStep,
  stepFieldKeys,
  type FormConfig,
} from "@/lib/form-config";
import { DynamicField } from "./DynamicField";
import { OptionListsProvider, type OptionRegistry } from "./OptionListsContext";

const DRAFT_KEY = "pasha-apply-draft-dyn-v1";
const DRAFT_DEBOUNCE_MS = 1000;

type Values = Record<string, unknown>;

export function DynamicForm({
  config,
  initialValues,
  initialStep = 0,
  serverPersist = false,
  optionLists,
}: {
  config: FormConfig;
  /** Server-saved draft values to resume from (applicant flow). */
  initialValues?: Values;
  /** Step index the applicant left off on. */
  initialStep?: number;
  /** Persist progress to the server draft API instead of localStorage. */
  serverPersist?: boolean;
  /** Resolved option-list registry (code + admin-managed DB lists). */
  optionLists?: OptionRegistry;
}) {
  const router = useRouter();

  const steps = useMemo(() => stepsOf(config), [config]);
  const titles = useMemo(() => stepTitlesOf(config), [config]);
  const schema = useMemo(() => buildZodSchema(config), [config]);
  const defaults = useMemo(
    () => ({ ...buildDefaultValues(config), ...(initialValues ?? {}) }),
    [config, initialValues]
  );

  // Map every field_key → its label, for friendly validation messages.
  const labelMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of config) for (const f of s.fields) m[f.field_key] = f.label ?? f.field_key;
    return m;
  }, [config]);

  const [stepIdx, setStepIdx] = useState(() => {
    const max = Math.max(0, steps.length - 1);
    return Math.min(Math.max(0, initialStep), max);
  }); // index into `steps`
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const draftRestoredOnce = useRef(false);
  // Serialized snapshot of the last payload we persisted — lets us skip saves
  // when nothing actually changed (form.watch() returns a fresh object every
  // render, and setSaveState re-renders, so a naive effect would loop forever).
  const lastSavedRef = useRef<string | null>(null);

  const totalSteps = steps.length;
  const currentStep = steps[stepIdx];

  const form = useForm<Values>({
    resolver: zodResolver(schema as never) as Resolver<Values>,
    mode: "onChange",
    defaultValues: defaults,
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- watch() is intentionally non-memoizable
  const values = form.watch();

  // Hydrate draft once (localStorage only). In server-persist mode the draft is
  // seeded into `defaults` from the DB, so there's nothing to restore here.
  useEffect(() => {
    if (serverPersist) return;
    if (draftRestoredOnce.current) return;
    draftRestoredOnce.current = true;
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(DRAFT_KEY) : null;
      if (!raw) return;
      const draft = JSON.parse(raw) as { savedAt?: number; values?: Values };
      if (!draft?.values) return;
      if (Date.now() - (draft.savedAt ?? 0) > 30 * 24 * 60 * 60 * 1000) {
        window.localStorage.removeItem(DRAFT_KEY);
        return;
      }
      form.reset({ ...form.getValues(), ...draft.values });
      setDraftRestored(true);
    } catch {
      /* corrupted draft — ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced autosave. Server-persist mode (applicant flow) writes to the
  // draft API so progress resumes across devices; otherwise localStorage. We
  // diff a serialized snapshot so the network is only hit on a *real* change —
  // not on every render (form.watch() + our setSaveState would otherwise loop).
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (serverPersist) {
      const payload = JSON.stringify({ data: values, current_step: stepIdx });
      // First run: the seeded values already match the server draft, so record
      // the baseline without a redundant write.
      if (lastSavedRef.current === null) {
        lastSavedRef.current = payload;
        return;
      }
      if (payload === lastSavedRef.current) return; // nothing actually changed

      const handle = window.setTimeout(() => {
        // Mark saved up front so the re-render from setSaveState doesn't re-fire
        // (and so a failing endpoint isn't hammered on every render).
        lastSavedRef.current = payload;
        setSaveState("saving");
        fetch("/api/applicant/draft", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: payload,
        })
          .then((res) => setSaveState(res.ok ? "saved" : "idle"))
          .catch(() => setSaveState("idle"));
      }, DRAFT_DEBOUNCE_MS);
      return () => window.clearTimeout(handle);
    }

    const handle = window.setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), values }));
      } catch {
        /* quota — ignore */
      }
    }, DRAFT_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [values, stepIdx, serverPersist]);

  const clearDraft = () => {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setDraftRestored(false);
  };

  const goNext = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (stepIdx >= totalSteps - 1) return;
    const keys = stepFieldKeys(config, currentStep);
    const ok = await form.trigger(keys);
    if (!ok) {
      const errs = form.formState.errors as Record<string, unknown>;
      const bad = keys.filter((k) => k in errs).map((k) => labelMap[k] ?? k);
      setError(`${titles[stepIdx]?.title ?? "This step"} needs: ${bad.join(", ")}`);
      return;
    }
    setError(null);
    setStepIdx(stepIdx + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => {
    setError(null);
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (data: Values) => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Submission failed");
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
      setError(e instanceof Error ? e.message : "Submission failed");
      setSubmitting(false);
    }
  };

  const onInvalid = (errs: Record<string, unknown>) => {
    const topLevel = Object.keys(errs).map((p) => (p.includes(".") ? p.slice(0, p.indexOf(".")) : p));
    // Jump to the first step that owns a failing field.
    for (let i = 0; i < totalSteps; i++) {
      const keys = stepFieldKeys(config, steps[i]);
      const overlap = keys.filter((k) => topLevel.includes(k));
      if (overlap.length > 0) {
        setError(`${titles[i]?.title ?? `Step ${i + 1}`} needs: ${overlap.map((k) => labelMap[k] ?? k).join(", ")}`);
        if (stepIdx !== i) {
          setStepIdx(i);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }
    }
    setError("Please review the form for errors.");
  };

  const stepInfo = titles[stepIdx];
  const isLast = stepIdx === totalSteps - 1;
  const progress = ((stepIdx + 1) / totalSteps) * 100;

  return (
    <FormProvider {...form}>
      <OptionListsProvider value={optionLists ?? {}}>
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
              <p>Your previous draft has been restored — we auto-save your progress as you type.</p>
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

      {/* Progress bar + step pills (supports any number of steps) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {titles.map((t, i) => (
            <button
              key={t.num}
              type="button"
              onClick={() => i < stepIdx && setStepIdx(i)}
              className={
                "text-xs font-medium transition-colors " +
                (i === stepIdx
                  ? "text-pasha-red"
                  : i < stepIdx
                  ? "text-pasha-ink hover:text-pasha-red cursor-pointer"
                  : "text-pasha-muted")
              }
            >
              {t.title}
            </button>
          ))}
        </div>
        <div className="h-1.5 rounded-full bg-pasha-line/60 overflow-hidden">
          <motion.div
            className="h-full bg-pasha-red rounded-full"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        {serverPersist && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-pasha-muted">
            <Save className="w-3 h-3" />
            <span>
              {saveState === "saving"
                ? "Saving…"
                : saveState === "saved"
                ? "Progress saved — you can leave and resume anytime."
                : "We auto-save your progress as you go."}
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl bg-white border border-pasha-line/70 shadow-[0_4px_16px_-4px_rgba(14,14,16,0.06)] overflow-hidden">
        <div className="px-6 sm:px-8 pt-7 pb-5 border-b border-pasha-line/60 bg-gradient-to-b from-pasha-stone/20 to-transparent">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[2px] text-pasha-red font-semibold">
            <span>
              Step {String(stepIdx + 1).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}
            </span>
            <span className="text-pasha-ink/20">·</span>
            <span className="text-pasha-muted font-normal">{stepInfo?.title}</span>
          </div>
          <h2 className="mt-2 font-serif text-2xl sm:text-3xl tracking-tight text-pasha-ink leading-tight">
            {stepInfo?.title}
          </h2>
          {stepInfo?.subtitle && (
            <p className="mt-1.5 text-sm text-pasha-muted leading-relaxed">{stepInfo.subtitle}</p>
          )}
        </div>

        <form onSubmit={(e) => e.preventDefault()} noValidate className="px-6 sm:px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-9"
            >
              {sectionsForStep(config, currentStep).map((section, idx) => (
                <div key={section.id} className="space-y-6">
                  {/* The first section of a step is the step itself (its title is
                      already in the header); later sections render a divider. */}
                  {idx > 0 && (
                    <div className="flex items-center gap-3">
                      <h3 className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-ink/70 font-semibold whitespace-nowrap">
                        {section.title}
                      </h3>
                      <span className="h-px flex-1 bg-pasha-line/70" />
                    </div>
                  )}
                  {section.fields.map((field) => (
                    <DynamicField key={field.id} field={field} />
                  ))}
                </div>
              ))}
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

        <div className="px-6 sm:px-8 py-5 border-t border-pasha-line/60 bg-pasha-stone/30 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goPrev}
            disabled={stepIdx === 0}
            className="inline-flex items-center gap-2 rounded-full border border-pasha-line bg-white px-4 py-2.5 text-sm font-medium text-pasha-ink hover:bg-pasha-stone/60 hover:border-pasha-ink/15 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {!isLast ? (
            <button
              type="button"
              onClick={goNext}
              className="group relative inline-flex items-center gap-2 rounded-full bg-pasha-ink px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-pasha-ink/15 hover:bg-pasha-red hover:-translate-y-0.5 transition-all"
            >
              <span className="relative">Continue</span>
              <ArrowRight className="relative w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (submitting) return;
                form.handleSubmit(onSubmit, onInvalid)();
              }}
              disabled={submitting}
              className="group relative inline-flex items-center gap-2 rounded-full bg-pasha-red px-7 py-3 text-sm font-medium text-white shadow-xl shadow-pasha-red/30 hover:bg-pasha-red-dark hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
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
      </OptionListsProvider>
    </FormProvider>
  );
}
