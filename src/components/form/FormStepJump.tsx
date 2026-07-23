"use client";

import { createContext, useContext } from "react";

// External "jump to this step" signal for DynamicForm. The nonce lets the same
// step be requested again (e.g. clicking the same step card twice) and still
// fire the effect. Null when no external controller is present.
export type FormStepJump = { step: number; nonce: number } | null;

export const FormStepJumpContext = createContext<FormStepJump>(null);

export function useFormStepJump() {
  return useContext(FormStepJumpContext);
}
