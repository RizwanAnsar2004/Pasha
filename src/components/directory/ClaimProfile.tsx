"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

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

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, json };
  }

  async function sendCode() {
    setBusy(true);
    setError(null);
    const { ok, json } = await post({ action: "start", databankId, email });
    setBusy(false);
    if (json?.claimed) return setClaimedElsewhere(true);
    if (!ok) return setError(json?.error ?? "Something went wrong.");
    setStep("code");
  }

  async function verify() {
    setBusy(true);
    setError(null);
    const { ok, json } = await post({ action: "verify", databankId, email, code });
    setBusy(false);
    if (json?.claimed) return setClaimedElsewhere(true);
    if (!ok) return setError(json?.error ?? "Something went wrong.");
    setStep("done");
  }

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
          <button type="button" onClick={sendCode} disabled={busy} className="text-[12px] text-white/55 underline hover:text-white">
            Resend code
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-[13px] text-pasha-red-light">{error}</p>}
    </div>
  );
}
