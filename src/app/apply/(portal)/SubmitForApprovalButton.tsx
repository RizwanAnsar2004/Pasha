"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";

// Submits the saved draft straight from the overview card, so an applicant who
// has already filled everything in doesn't have to re-enter the wizard and
// scroll to the last step just to hand it to the committee.
//
// Posts the server-rendered draft values as-is — the same payload the form
// would send — and /api/submit re-validates them, so a stale `canSubmit` can
// never push an incomplete application through.
export function SubmitForApprovalButton({
  data,
  canSubmit,
  missing,
}: {
  data: Record<string, unknown>;
  canSubmit: boolean;
  // Labels of the still-missing required fields, for the disabled-state hint.
  missing: string[];
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.post<{ tier?: string; score?: number; id: string }>(
        ENDPOINTS.submit,
        data
      );
      const params = new URLSearchParams({
        tier: result.tier ?? "listed",
        score: String(result.score ?? 0),
        id: result.id,
      });
      router.push(`/apply/success?${params.toString()}`);
    } catch (e) {
      setError(apiErrorMessage(e, "Couldn't submit your application"));
      // Drop back out of the confirm state so the error is read before retrying.
      setConfirming(false);
      setLoading(false);
    }
  };

  if (!canSubmit) {
    return (
      <button
        type="button"
        disabled
        title={
          missing.length > 0
            ? `Still needed: ${missing.join(", ")}`
            : "Complete the required fields to submit"
        }
        className="inline-flex items-center gap-2 rounded-full border border-pasha-line bg-pasha-stone/60 px-5 py-2.5 text-sm font-medium text-pasha-muted cursor-not-allowed"
      >
        Submit for approval
        <Check className="w-4 h-4" />
      </button>
    );
  }

  // Two-step confirm: submitting locks the application until the committee
  // responds, and there's no wizard context here to make that obvious.
  if (confirming) {
    return (
      // inline-flex + items-start so this column sizes to its content instead
      // of stretching to the height of the button row it sits in.
      <div className="inline-flex flex-col items-start gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-pasha-red px-5 py-2.5 text-sm font-medium text-white shadow-md hover:bg-pasha-red-dark transition-all disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                Yes, submit
                <Check className="w-4 h-4" />
              </>
            )}
          </button>
          {!loading && (
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="inline-flex items-center rounded-full px-4 py-2.5 text-sm font-medium text-pasha-muted hover:text-pasha-ink transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
        <p className="text-xs text-pasha-muted">
          Your application locks while the committee reviews it.
        </p>
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="group inline-flex items-center gap-2 rounded-full bg-pasha-red px-5 py-2.5 text-sm font-medium text-white shadow-md hover:bg-pasha-red-dark transition-all"
      >
        Submit for approval
        <Check className="w-4 h-4 transition-transform group-hover:scale-110" />
      </button>
      {error && <p className="text-xs text-pasha-red">{error}</p>}
    </div>
  );
}
