"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
} from "@/lib/forms/form-config";
import { DynamicField } from "./DynamicField";
import { AutoOptionalLabels } from "./Field";
import { ErrorFieldLinks } from "./ErrorFieldLinks";
import { OptionListsProvider, type OptionRegistry } from "./OptionListsContext";
import { funnel } from "@/lib/utils/analytics";
import { api, apiErrorMessage } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";

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
  // Server-saved draft values to resume from (applicant flow).
  initialValues?: Values;
  // Step index the applicant left off on.
  initialStep?: number;
  // Persist progress to the server draft API instead of localStorage.
  serverPersist?: boolean;
  // Resolved option-list registry (code + admin-managed DB lists).
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

  // Furthest step index whose fields already hold saved values. On a resumed
  // draft (e.g. after re-login) the server's `current_step` can be 0 while the
  // data spans several steps — without this, the stepper would only unlock up
  // to `current_step` and every already-filled step ahead would stay disabled.
  const initialMaxFilledStep = useMemo(() => {
    const data = initialValues;
    if (!data) return 0;
    const hasValue = (v: unknown) =>
      Array.isArray(v)
        ? v.length > 0
        : v !== undefined && v !== null && v !== "";
    let furthest = 0;
    for (let i = 0; i < steps.length; i++) {
      const filled = stepFieldKeys(config, steps[i]).some((k) => hasValue(data[k]));
      if (filled) furthest = i;
    }
    return furthest;
  }, [config, steps, initialValues]);

  // Furthest step the user has reached, so the stepper can jump forward to any already-visited step (not just strictly-earlier ones).
  const [maxStepReached, setMaxStepReached] = useState(() =>
    Math.max(
      Math.min(Math.max(0, initialStep), Math.max(0, steps.length - 1)),
      initialMaxFilledStep
    )
  );
  const [submitting, setSubmitting] = useState(false);
  // Explicit "Save" is separate from `submitting` — saving leaves the applicant
  // on the form, submitting navigates away.
  const [savingNow, setSavingNow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Fields named in the error banner, rendered as buttons that jump to the input.
  const [errorFields, setErrorFields] = useState<{ name: string; label: string }[]>([]);
  const [draftRestored, setDraftRestored] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const draftRestoredOnce = useRef(false);
  const stepRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const [progressWidth, setProgressWidth] = useState(0);
  // Serialized snapshot of the last payload we persisted — lets us skip saves when nothing actually changed (form.watch() returns a fresh object every.
  const lastSavedRef = useRef<string | null>(null);

  const totalSteps = steps.length;
  const currentStep = steps[stepIdx];

  // Remember the furthest step reached so it stays clickable after going back.
  useEffect(() => {
    setMaxStepReached((m) => Math.max(m, stepIdx));
  }, [stepIdx]);

  const form = useForm<Values>({
    resolver: zodResolver(schema as never) as Resolver<Values>,
    mode: "onTouched",
    defaultValues: defaults,
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- watch() is intentionally non-memoizable
  const values = form.watch();

  // Submission is gated on the form's own schema — the same rules (and the same admin `required` flags) that power per-step Continue validation.
  const submitCheck = useMemo(() => schema.safeParse(values), [schema, values]);
  const canSubmit = submitCheck.success;
  const missingRequired = useMemo(() => {
    if (submitCheck.success) return [] as { key: string; label: string }[];
    const seen = new Set<string>();
    const out: { key: string; label: string }[] = [];
    for (const issue of submitCheck.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({ key, label: labelMap[key] ?? key });
    }
    return out;
  }, [submitCheck, labelMap]);

  // Fire the funnel "started" event once when the form mounts.
  useEffect(() => {
    funnel.started();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hydrate draft once (localStorage only).
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
      // corrupted draft — ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced autosave.
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (serverPersist) {
      const draft = { data: values, current_step: stepIdx };
      const payload = JSON.stringify(draft);
      // First run: the seeded values already match the server draft, so record the baseline without a redundant write.
      if (lastSavedRef.current === null) {
        lastSavedRef.current = payload;
        return;
      }
      if (payload === lastSavedRef.current) return; // nothing actually changed

      const handle = window.setTimeout(() => {
        // Mark saved up front so the re-render from setSaveState doesn't re-fire (and so a failing endpoint isn't hammered on every render).
        lastSavedRef.current = payload;
        setSaveState("saving");
        api
          .put(ENDPOINTS.applicant.draft, draft)
          .then(() => setSaveState("saved"))
          .catch(() => setSaveState("idle"));
      }, DRAFT_DEBOUNCE_MS);
      return () => window.clearTimeout(handle);
    }

    const handle = window.setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), values }));
      } catch {
        // quota — ignore
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

  // Explicit save — flushes the current values immediately instead of waiting
  // for the debounce, so "Save" is a real, confirmable action rather than a
  // relabelled no-op. Deliberately skips validation: a half-finished answer is
  // exactly what someone saving for later wants to keep.
  const saveNow = async () => {
    if (savingNow) return;
    setError(null);
    setErrorFields([]);
    const draft = { data: form.getValues(), current_step: stepIdx };
    setSavingNow(true);
    setSaveState("saving");
    try {
      if (serverPersist) {
        await api.put(ENDPOINTS.applicant.draft, draft);
      } else {
        window.localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ savedAt: Date.now(), values: draft.data })
        );
      }
      // Record the baseline so the autosave effect doesn't immediately repeat
      // the same write.
      lastSavedRef.current = JSON.stringify(draft);
      setSaveState("saved");
    } catch (e) {
      setSaveState("idle");
      setError(apiErrorMessage(e, "Couldn't save your progress"));
    } finally {
      setSavingNow(false);
    }
  };

  const goNext = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (stepIdx >= totalSteps - 1) return;
    const keys = stepFieldKeys(config, currentStep);
    const ok = await form.trigger(keys);
    if (!ok) {
      const errs = form.formState.errors as Record<string, unknown>;
      const bad = keys.filter((k) => k in errs);
      setError(`${titles[stepIdx]?.title ?? "This step"} needs:`);
      setErrorFields(bad.map((k) => ({ name: k, label: labelMap[k] ?? k })));
      return;
    }
    setError(null);
    setErrorFields([]);
    // Wipe any errors carried over from the previous step so the next step starts clean — the user should only see errors after touching a field or.
    form.clearErrors();
    funnel.stepCompleted(stepIdx, titles[stepIdx]?.title);
    setStepIdx(stepIdx + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => {
    setError(null);
    setErrorFields([]);
    // Same reason as goNext: re-entering a step shouldn't display errors that were populated by an earlier trigger() call.
    form.clearErrors();
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Advance WITHOUT validating the current step — lets applicants move past steps whose fields are all optional.
  const goSkip = () => {
    if (stepIdx >= totalSteps - 1) return;
    setError(null);
    setErrorFields([]);
    form.clearErrors();
    funnel.stepCompleted(stepIdx, titles[stepIdx]?.title, true);
    setStepIdx(stepIdx + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (data: Values) => {
    setError(null);
    setErrorFields([]);
    setSubmitting(true);
    try {
      const result = await api.post<{ tier?: string; score?: number; id: string }>(ENDPOINTS.submit, data);
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

  const updateProgressWidth = useCallback(() => {
    const first = stepRefs.current[0];
    const current = stepRefs.current[stepIdx];
    const track = trackRef.current;
    if (!first || !current || !track) return;
    const trackRect = track.getBoundingClientRect();
    const firstRect = first.getBoundingClientRect();
    const currentRect = current.getBoundingClientRect();
    setProgressWidth(currentRect.right - Math.max(trackRect.left, firstRect.left));
  }, [stepIdx]);

  useEffect(() => {
    updateProgressWidth();
    const row = trackRef.current?.previousElementSibling;
    if (!(row instanceof HTMLElement)) return;

    const ro = new ResizeObserver(updateProgressWidth);
    ro.observe(row);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener("resize", updateProgressWidth);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateProgressWidth);
    };
  }, [updateProgressWidth, titles]);

  return (
    <FormProvider {...form}>
      <OptionListsProvider value={optionLists ?? {}}>
      <AutoOptionalLabels>
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
        {/* Mobile: single compact caption — the full spread label row collides */}
        <div className="sm:hidden mb-2 flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium text-pasha-red truncate">
            {titles[stepIdx]?.title}
          </span>
          <span className="text-[11px] font-mono text-pasha-muted shrink-0 tabular-nums">
            Step {stepIdx + 1} / {titles.length}
          </span>
        </div>
        <div className="relative hidden sm:flex items-center justify-between mb-2">
          {titles.map((t, i) => (
            <button
              key={t.num}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
              type="button"
              onClick={() => i !== stepIdx && i <= maxStepReached && setStepIdx(i)}
              className={
                "text-xs font-medium transition-colors " +
                (titles.length === 3 && i === 1
                  ? "absolute left-1/2 -translate-x-1/2 "
                  : "") +
                (i === stepIdx
                  ? "text-pasha-red"
                  : i <= maxStepReached
                  ? "text-pasha-ink hover:text-pasha-red cursor-pointer"
                  : "text-pasha-muted")
              }
            >
              {t.title}
            </button>
          ))}
        </div>
        <div ref={trackRef} className="relative h-1.5 rounded-full bg-pasha-line/60 overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 h-full bg-pasha-red rounded-full"
            initial={false}
            animate={{
              width:
                progressWidth > 0
                  ? progressWidth
                  : `${((stepIdx + 1) / titles.length) * 100}%`,
            }}
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
                  {/* The first section of a step is the step itself (its title is */}
                  {idx > 0 && (
                    <div className="flex items-center gap-3">
                      <h3 className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-ink/70 font-semibold whitespace-nowrap">
                        {section.title}
                      </h3>
                      <span className="h-px flex-1 bg-pasha-line/70" />
                    </div>
                  )}
                  {/* data-field anchors the error-banner jump links. Rich text,
                      selects and uploads render no native `name` attribute, so
                      the wrapper is the only reliable target. */}
                  {section.fields.map((field) => (
                    <div key={field.id} data-field={field.field_key}>
                      <DynamicField field={field} />
                    </div>
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
              <ErrorFieldLinks fields={errorFields} />
            </motion.div>
          )}

          {isLast && !canSubmit && (
            <div className="mt-6 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">Complete the required fields to submit</p>
              <p className="mt-1 text-amber-800/90">
                Still needed: {missingRequired.map((m) => m.label).join(", ")}.
              </p>
            </div>
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goSkip}
                className="inline-flex items-center rounded-full px-4 py-2.5 text-sm font-medium text-pasha-muted hover:text-pasha-ink transition-colors"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={goNext}
                className="group relative inline-flex items-center gap-2 rounded-full bg-pasha-ink px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-pasha-ink/15 hover:bg-pasha-red hover:-translate-y-0.5 transition-all"
              >
                <span className="relative">Continue</span>
                <ArrowRight className="relative w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Save keeps the applicant on the form and never validates, so an
                  incomplete application can still be parked and resumed. */}
              <button
                type="button"
                onClick={saveNow}
                disabled={savingNow || submitting}
                className="inline-flex items-center gap-2 rounded-full border border-pasha-line bg-white px-5 py-2.5 text-sm font-medium text-pasha-ink hover:bg-pasha-stone/60 hover:border-pasha-ink/15 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {savingNow ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (submitting || savingNow || !canSubmit) return;
                  form.handleSubmit(onSubmit, onInvalid)();
                }}
                disabled={submitting || savingNow || !canSubmit}
                title={canSubmit ? undefined : "Complete the required fields to submit"}
                className="group relative inline-flex items-center gap-2 rounded-full bg-pasha-red px-7 py-3 text-sm font-medium text-white shadow-xl shadow-pasha-red/30 hover:bg-pasha-red-dark hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {submitting ? (
                  <>
                    <Loader2 className="relative w-4 h-4 animate-spin" />
                    <span className="relative">Submitting…</span>
                  </>
                ) : (
                  <>
                    <span className="relative">Submit for approval</span>
                    <Check className="relative w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      </AutoOptionalLabels>
      </OptionListsProvider>
    </FormProvider>
  );
}
