"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";

// Pause after the last keystroke before asking the server. Long enough that
// typing a name is one request rather than one per character, short enough that
// the answer arrives while the applicant is still looking at the field.
const DEBOUNCE_MS = 500;

// Matches MIN_NAME_LENGTH on the server. Below this the query matches most of
// the table, so there is nothing useful to report.
const MIN_LENGTH = 2;

function normalise(name: string): string {
  return name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

type Result = { name: string; existing: string } | null;

// Startup name input that reports an existing listing while the applicant types.
//
// The one-listing-per-company rule ran only at submit, so someone could fill
// all six steps before being told the name was taken. This asks the same
// question after a short pause in typing and renders the answer under the
// field.
//
// The submit-time check stays exactly as it is. This one runs against a name
// that can be claimed a second later and can be defeated by simply not pausing,
// so it is a courtesy to the person typing, not the rule itself.
export function StartupNameField({
  register,
  label,
  hint,
  required,
  error,
  placeholder,
  maxLength,
  initialValue = "",
}: {
  register: UseFormRegisterReturn;
  label?: string;
  hint?: ReactNode;
  required?: boolean;
  error?: string;
  placeholder?: string;
  maxLength?: number;
  // Seeds the check from a restored draft, so an applicant resuming an
  // application sees the warning without having to retype the name.
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Result>(null);

  // Aborts the previous lookup when a new keystroke supersedes it, so a slow
  // early response cannot land after a faster later one and report on a name
  // the applicant has already changed.
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = value.trim();
    if (normalise(trimmed).length < MIN_LENGTH) {
      setResult(null);
      setChecking(false);
      return;
    }
    // Already answered for this exact name — no need to ask again.
    if (result && result.name === trimmed) return;

    setChecking(true);
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await api.get<{ taken: boolean; existing?: string }>(
          `${ENDPOINTS.applicant.startupName}?name=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        setResult(res.taken && res.existing ? { name: trimmed, existing: res.existing } : null);
      } catch {
        // Offline, signed out, or a server error. Stay silent: the submit-time
        // check is the actual gate, and a scary message here would be wrong far
        // more often than right.
        setResult(null);
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
    // `result` is deliberately excluded: including it re-runs this on every
    // answer, and the same-name guard above already reads the latest value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const taken = result && result.name === value.trim() ? result.existing : null;

  // The schema error wins: an empty required field is the more basic problem,
  // and stacking two messages under one input reads as two separate faults.
  const message = error ?? (taken ? `"${taken}" is already listed in the directory.` : undefined);

  return (
    <Field
      label={label}
      required={required}
      error={message}
      hint={
        !message && taken === null && checking ? (
          <span className="inline-flex items-center gap-1.5 text-pasha-muted">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Checking availability…
          </span>
        ) : (
          hint
        )
      }
    >
      <Input
        placeholder={placeholder}
        maxLength={maxLength}
        {...register}
        onChange={(e) => {
          setValue(e.target.value);
          return register.onChange(e);
        }}
      />
      {/* Politely announced, so the result reaches a screen reader user who
          never sees the message appear under the field. */}
      <span aria-live="polite" className="sr-only">
        {taken ? `${taken} is already listed in the directory.` : ""}
      </span>
    </Field>
  );
}
