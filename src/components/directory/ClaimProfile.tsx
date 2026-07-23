"use client";

import { useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api/client";
import {
  CaptchaWidget,
  captchaConfigured,
  type CaptchaHandle,
} from "@/components/auth/CaptchaWidget";

type Step = "idle" | "email" | "code" | "done";

// Self-service claim: request a code to a company email, verify it, take ownership.
export function ClaimProfile({
  databankId,
  alreadyClaimed,
}: {
  databankId: string;
  alreadyClaimed: boolean;
}) {
  const [step, setStep] = useState<Step>(alreadyClaimed ? "done" : "idle");
  const [claimedElsewhere, setClaimedElsewhere] = useState(alreadyClaimed);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaHandle>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  async function claim(body: Record<string, unknown>, onOk: () => void) {
    setBusy(true);
    setError(null);
    // Only `start` is gated server-side, so only that call carries a token.
    const gated = body.action === "start";
    try {
      await api.post("/api/claim", gated ? { ...body, captchaToken } : body);
      onOk();
    } catch (e) {
      if (e instanceof ApiError && e.data.claimed) return setClaimedElsewhere(true);
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      // Turnstile tokens are single-use; the one just sent is spent whether the
      // request succeeded or not. Re-arm so "Resend code" isn't rejected for
      // replaying a stale token.
      if (gated && captchaConfigured) {
        setCaptchaToken(null);
        captchaRef.current?.reset();
      }
      setBusy(false);
    }
  }

  const sendCode = () => claim({ action: "start", databankId, email }, () => setStep("code"));
  const verify = () => claim({ action: "verify", databankId, email, code }, () => setStep("done"));

  if (claimedElsewhere || step === "done") {
    return (
      <div className="mb-8 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 sm:px-5 sm:py-4 text-sm text-white/85">
        <p className="inline-flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-pasha-red-light" />
          {step === "done" && !claimedElsewhere
            ? "Profile claimed — you're now the owner. Sign in with this email to manage it."
            : "This profile has already been claimed. Contact startups@pasha.org.pk if you need access."}
        </p>
      </div>
    );
  }

  // Needed on both steps: "Resend code" on the code step calls sendCode, which
  // is the same gated `start` action. Only one step renders at a time, so
  // `captchaRef` always points at the mounted widget.
  const captchaNode = (
    <CaptchaWidget
      ref={captchaRef}
      onToken={setCaptchaToken}
      className="flex justify-start"
    />
  );

  return (
    <div className="mb-8 rounded-2xl border border-pasha-red/30 bg-pasha-red/[0.08] px-4 py-3.5 sm:px-5 sm:py-4 text-sm text-white/85">
      <p className="leading-relaxed">
        <strong className="font-semibold text-white">Is this your company?</strong>{" "}
        This profile was imported from a public source. Claim ownership to keep it up to date.
      </p>

      {step === "idle" && (
        <button
          type="button"
          onClick={() => setStep("email")}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-pasha-red px-4 py-2 text-sm font-semibold text-white hover:bg-pasha-red-dark transition-colors"
        >
          Claim this profile
        </button>
      )}

      {step === "email" && (
        <div className="mt-3 space-y-2">
          <label className="block text-[13px] text-white/70">Your company email address</label>
          {captchaNode}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="flex-1 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-pasha-red-light"
            />
            <button
              type="button"
              disabled={busy || !email.trim()}
              onClick={sendCode}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-pasha-red px-4 py-2 text-sm font-semibold text-white hover:bg-pasha-red-dark disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send code
            </button>
          </div>
        </div>
      )}

      {step === "code" && (
        <div className="mt-3 space-y-2">
          <label className="block text-[13px] text-white/70">
            Enter the 6-digit code sent to <span className="text-white">{email}</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="flex-1 rounded-lg border border-white/15 bg-white/10 px-3 py-2 tracking-[6px] font-mono text-white placeholder:text-white/40 focus:outline-none focus:border-pasha-red-light"
            />
            <button
              type="button"
              disabled={busy || code.length !== 6}
              onClick={verify}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-pasha-red px-4 py-2 text-sm font-semibold text-white hover:bg-pasha-red-dark disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Verify
            </button>
          </div>
          {captchaNode}
          <button type="button" onClick={sendCode} disabled={busy} className="text-[12px] text-white/55 underline hover:text-white">
            Resend code
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-[13px] text-pasha-red-light">{error}</p>}
    </div>
  );
}
