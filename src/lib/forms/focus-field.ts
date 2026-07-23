// Scroll to (and focus) the input behind a validation error so the summary
// banner at the bottom of a form can act as a jump list instead of just naming
// fields the applicant then has to hunt for.
//
// Registered inputs are found by their `name` attribute. Custom controls
// (selects, uploads, repeater rows) may not expose one, so we fall back to a
// `data-field` hook and finally to a prefix match — "founders" should land on
// the first founders.* input rather than doing nothing.
export function focusFormField(name: string): boolean {
  if (typeof document === "undefined") return false;

  const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(name) : name;

  // `data-field` is an explicit anchor on the field wrapper, so it wins: a
  // rich-text or select control may carry a `name` on a hidden element that
  // can't be scrolled to.
  const candidates = [
    `[data-field="${escaped}"]`,
    `[name="${escaped}"]`,
    `[data-field^="${escaped}."]`,
    `[name^="${escaped}."]`,
  ];

  let el: HTMLElement | null = null;
  for (const selector of candidates) {
    const match = document.querySelector<HTMLElement>(selector);
    // Skip anything not actually laid out (display:none, unmounted step).
    if (match && match.getClientRects().length > 0) {
      el = match;
      break;
    }
    if (match && !el) el = match;
  }

  if (!el) return false;

  el.scrollIntoView({ behavior: "smooth", block: "center" });
  // Focusing a control that's mid-scroll fights the smooth scroll, so suppress
  // the browser's own scroll-on-focus.
  const focusable =
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLButtonElement
      ? el
      : el.querySelector<HTMLElement>("input, textarea, select, button");
  focusable?.focus({ preventScroll: true });
  return true;
}
