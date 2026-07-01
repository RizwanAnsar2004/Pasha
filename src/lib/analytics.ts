import { sendGAEvent } from "@next/third-parties/google";

/**
 * Whether Google Analytics is configured. When the measurement ID is absent
 * (local dev, previews, or before GA is set up) every tracking call is a no-op,
 * so callers never have to guard.
 */
const GA_ENABLED = Boolean(process.env.NEXT_PUBLIC_GA_ID);

/**
 * Fire a GA4 event. Safe to call from anywhere on the client — it silently does
 * nothing when GA isn't configured, and swallows any errors so analytics can
 * never break a user flow.
 */
export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (!GA_ENABLED) return;
  try {
    sendGAEvent("event", name, params ?? {});
  } catch {
    // Analytics must never throw into the app.
  }
}

/** Application funnel milestones — the numbers P@SHA actually cares about. */
export const funnel = {
  /** Applicant opened the multi-step application form. */
  started: () => trackEvent("application_started"),
  /** Applicant advanced past a step (0-based index + step title). */
  stepCompleted: (step: number, title?: string, skipped = false) =>
    trackEvent("application_step_completed", { step, title, skipped }),
  /** Application successfully submitted (with server-assigned tier/score). */
  submitted: (params?: { tier?: string; score?: number }) =>
    trackEvent("application_submitted", params),
};
