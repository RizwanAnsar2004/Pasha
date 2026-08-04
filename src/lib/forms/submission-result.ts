// Hand-off of the server's vetting result from the apply form to the success
// page.
//
// These used to travel as query params (/apply/success?tier=…&score=…), which
// put an internal quality-control signal in the address bar, in browser
// history, and in anything that logs URLs. The score comes from scoreVetting()
// and gates featured/listed/watchlist/excluded — showing an applicant the
// number computed about them also lets them resubmit with varied answers and
// watch it move, which is how you reverse-engineer the field weighting.
//
// sessionStorage rather than a route param or in-memory state: the success page
// is a separate route, so in-memory state does not survive the navigation, and
// sessionStorage is scoped to the tab and cleared on read.

const RESULT_KEY = "pasha:submission-result";

export type SubmissionResult = { tier?: string; score?: number };

export function stashSubmissionResult(result: SubmissionResult): void {
  try {
    window.sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
  } catch {
    // Private-browsing quota errors must never block the redirect to the
    // success page — the analytics event is the only thing that degrades.
  }
}

// Reads and removes the stashed result. Returns an empty object when there is
// nothing stored, which is the normal case for anyone who opens
// /apply/success directly rather than arriving from a submission.
export function takeSubmissionResult(): SubmissionResult {
  try {
    const raw = window.sessionStorage.getItem(RESULT_KEY);
    if (!raw) return {};
    window.sessionStorage.removeItem(RESULT_KEY);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const { tier, score } = parsed as SubmissionResult;
    return {
      tier: typeof tier === "string" ? tier : undefined,
      score: typeof score === "number" && Number.isFinite(score) ? score : undefined,
    };
  } catch {
    return {};
  }
}
