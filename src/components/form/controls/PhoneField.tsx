"use client";

import { useState, type ReactNode } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/Input";
import {
  PHONE_REJECTION_MESSAGES,
  phoneRegisterProps,
  type PhoneRejection,
} from "@/lib/validators/phone";

// A phone input that can explain a rejected keystroke.
//
// sanitizePhoneInput strips invalid characters before react-hook-form sees the
// value, so typing only letters leaves the field empty and the schema reports
// "Required" — which reads as though nothing was typed. The rejection was
// previously conveyed only by a 0.5s CSS pulse and a screen-reader
// announcement, neither of which explains the "Required" sitting underneath.
//
// This surfaces PHONE_REJECTED_MESSAGE in the field's own error slot and takes
// precedence over the schema error while it is showing. It clears on the next
// keystroke that is accepted whole, and on blur, so normal validation resumes.
export function usePhoneField(register: UseFormRegisterReturn) {
  const [rejection, setRejection] = useState<PhoneRejection | null>(null);

  const inputProps = phoneRegisterProps(register, {
    onReject: setRejection,
    onAccept: () => setRejection(null),
  });

  return {
    inputProps,
    // Callers pass this through `error` — it must win over the schema message,
    // which for filtered-out input is the misleading "Required".
    rejectionMessage: rejection ? PHONE_REJECTION_MESSAGES[rejection] : undefined,
  };
}

export function PhoneField({
  register,
  label,
  hint,
  required,
  error,
  placeholder,
  maxLength,
}: {
  register: UseFormRegisterReturn;
  label?: string;
  hint?: ReactNode;
  required?: boolean;
  error?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  const { inputProps, rejectionMessage } = usePhoneField(register);

  return (
    <Field label={label} hint={hint} required={required} error={rejectionMessage ?? error}>
      <Input placeholder={placeholder} maxLength={maxLength} {...inputProps} />
    </Field>
  );
}
