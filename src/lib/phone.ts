import type { ChangeEvent } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

export const PHONE_MIN_DIGITS = 7;
export const PHONE_MAX_DIGITS = 15;
export const PHONE_VALIDATION_MESSAGE = "Enter a valid phone number";

/** Strip characters that aren't valid in a phone number while typing. */
export function sanitizePhoneInput(value: string): string {
  return value.replace(/[^\d+\s().-]/g, "");
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

/** Props for a tel input wired to react-hook-form with live character filtering. */
export function phoneRegisterProps<T extends UseFormRegisterReturn>({
  onChange,
  ...rest
}: T) {
  return {
    ...rest,
    type: "tel" as const,
    inputMode: "tel" as const,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitizePhoneInput(e.target.value);
      if (sanitized !== e.target.value) {
        e.target.value = sanitized;
      }
      return onChange(e);
    },
  };
}
