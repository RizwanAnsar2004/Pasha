import type { ChangeEvent, FocusEvent } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

export const PHONE_MIN_DIGITS = 7;
export const PHONE_MAX_DIGITS = 15;
export const PHONE_VALIDATION_MESSAGE = "Enter a valid phone number";

// Shown while the user is typing, when a character was filtered out.
//
// These exist because the sanitizer runs before react-hook-form sees the value,
// so typing only letters leaves the field empty and the schema reports
// "Required" — which reads as though nothing was typed at all.
// PHONE_VALIDATION_MESSAGE above can never fire for letters for the same
// reason: they are stripped long before isValidPhone() runs.
//
// Two distinct reasons, because sanitizePhoneInput drops characters on two
// different grounds and one message cannot honestly cover both: a 16th digit is
// not a letter, and telling someone otherwise is worse than saying nothing.
export type PhoneRejection = "chars" | "length";

export const PHONE_REJECTION_MESSAGES: Record<PhoneRejection, string> = {
  chars: "Numbers only — letters aren't allowed in a phone number",
  length: `A phone number can be at most ${PHONE_MAX_DIGITS} digits`,
};

// Why sanitizePhoneInput would alter this value, or null if it would not.
// Character rejection is reported first: if someone pastes an over-long string
// of letters, the letters are the thing to explain.
export function phoneRejectionReason(raw: string): PhoneRejection | null {
  if (/[^\d+\s().-]/.test(raw)) return "chars";
  if (countPhoneDigits(raw) > PHONE_MAX_DIGITS) return "length";
  return null;
}

// Strip characters that aren't valid in a phone number while typing,
export function sanitizePhoneInput(value: string): string {
  const cleaned = value.replace(/[^\d+\s().-]/g, "");
  let digits = 0;
  let out = "";
  for (const ch of cleaned) {
    if (/\d/.test(ch)) {
      if (digits >= PHONE_MAX_DIGITS) continue;
      digits++;
    }
    out += ch;
  }
  return out;
}

export function countPhoneDigits(value: string): number {
  return value.replace(/\D/g, "").length;
}

export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (!/^[\d+\s().-]+$/.test(trimmed)) return false;
  const digits = countPhoneDigits(trimmed);
  return digits >= PHONE_MIN_DIGITS && digits <= PHONE_MAX_DIGITS;
}

const REJECT_ATTR = "data-phone-rejected";
const REJECT_MS = 500;
const LIVE_REGION_ID = "phone-input-live-region";

// Screen readers get nothing from a CSS pulse, so rejections are also announced.
// One shared polite region for every phone field on the page — created lazily so
// nothing is added to the DOM for pages that have no phone input.
function announceRejection(message: string): void {
  if (typeof document === "undefined") return;
  let region = document.getElementById(LIVE_REGION_ID);
  if (!region) {
    region = document.createElement("div");
    region.id = LIVE_REGION_ID;
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    // Visually hidden, still announced.
    region.style.cssText =
      "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0";
    document.body.appendChild(region);
  }
  // Re-setting identical text does not re-announce, so clear first.
  region.textContent = "";
  window.setTimeout(() => {
    region!.textContent = message;
  }, 50);
}

// Flags the input so CSS can pulse it — see the [data-phone-rejected] rule in
// globals.css. Attribute-based rather than React state so every existing call
// site gets the feedback without changing how it renders the input.
function flashRejection(el: HTMLInputElement, reason: PhoneRejection): void {
  el.setAttribute(REJECT_ATTR, "true");
  window.setTimeout(() => el.removeAttribute(REJECT_ATTR), REJECT_MS);
  announceRejection(PHONE_REJECTION_MESSAGES[reason]);
}

// Props for a tel input wired to react-hook-form with live character filtering.
//
// The filtering used to be silent: typing a letter simply produced nothing, with
// no outline change, no message and no cursor movement, which reads as a broken
// field rather than a rejected keystroke — and on the signup form, a field that
// looks broken costs the signup. Rejections are now shown (a red pulse) and
// announced (a polite live region).
//
// `onReject` / `onAccept` let a caller render a visible message alongside the
// pulse — see usePhoneField in components/form/controls/PhoneField.tsx. They are
// optional so this stays usable as a plain props helper.
export function phoneRegisterProps<T extends UseFormRegisterReturn>(
  { onChange, ...rest }: T,
  callbacks?: { onReject?: (reason: PhoneRejection) => void; onAccept?: () => void }
) {
  return {
    ...rest,
    type: "tel" as const,
    inputMode: "tel" as const,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      // Read the reason from what the user actually typed, before the assignment
      // below replaces it — the sanitized value has no rejection reason left in
      // it by definition, so reading it afterwards always reports "chars".
      const raw = e.target.value;
      const sanitized = sanitizePhoneInput(raw);
      if (sanitized === raw) {
        callbacks?.onAccept?.();
      } else {
        // Preserve the caret: assigning .value moves it to the end, which makes
        // editing the middle of a number jump unexpectedly.
        const el = e.target;
        const removedBeforeCaret =
          (el.value.slice(0, el.selectionStart ?? 0).length) -
          (sanitizePhoneInput(el.value.slice(0, el.selectionStart ?? 0)).length);
        const caret = Math.max(0, (el.selectionStart ?? sanitized.length) - removedBeforeCaret);
        el.value = sanitized;
        try {
          el.setSelectionRange(caret, caret);
        } catch {
          // Some browsers reject setSelectionRange on type="tel"; harmless.
        }
        const reason = phoneRejectionReason(raw) ?? "chars";
        flashRejection(el, reason);
        callbacks?.onReject?.(reason);
      }
      return onChange(e);
    },
    onBlur: (e: FocusEvent<HTMLInputElement>) => {
      // Hand the field back to normal schema validation once focus leaves, so
      // the transient "numbers only" note cannot outlive the editing session.
      callbacks?.onAccept?.();
      return rest.onBlur(e);
    },
  };
}
