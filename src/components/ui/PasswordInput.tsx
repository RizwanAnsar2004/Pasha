"use client";

// Password input with a show/hide (eye) toggle. Drop-in replacement for a
// plain <input type="password"> — forwards all the usual input props and adds
// the toggle button on the right. The `pr-10` is appended automatically so the
// text never sits under the icon.

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Classes for the wrapping element (e.g. margins) — keeps the toggle aligned. */
  wrapperClassName?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, wrapperClassName, ...props }, ref) {
    const [show, setShow] = useState(false);
    return (
      <div className={cn("relative", wrapperClassName)}>
        <input ref={ref} type={show ? "text" : "password"} className={cn(className, "pr-10")} {...props} />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center text-pasha-muted transition-colors hover:text-pasha-ink"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  }
);
