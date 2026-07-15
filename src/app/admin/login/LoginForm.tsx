"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, Loader2, AlertCircle, MailCheck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PasswordInput } from "@/components/ui/PasswordInput";

function LoginInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const redirect = sp.get("redirect") ?? "/admin";
  const authError = sp.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(() => {
    if (authError === "unauthorized_email") {
      return "You are signed in with a non-committee account. Sign in with a committee email to continue, or sign out of the applicant portal first.";
    }
    return null;
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Sign-in failed");
      router.replace(redirect);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "forgot", email }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not send the reset email");
      setNotice("sent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the reset email");
    } finally {
      setLoading(false);
    }
  }

  function toForgot() {
    setForgot(true);
    setError(null);
    setNotice(null);
  }
  function toSignIn() {
    setForgot(false);
    setError(null);
    setNotice(null);
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-pasha-stone/30">
        <div className="mx-auto max-w-md px-4 sm:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-pasha-line bg-white p-8 shadow-sm"
          >
            {forgot && notice === "sent" ? (
              // Centered confirmation after the reset link is sent.
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-xl bg-green-600/10 grid place-items-center mb-5">
                  <MailCheck className="w-6 h-6 text-green-700" />
                </div>
                <h1 className="font-serif text-2xl tracking-tight text-pasha-ink">Email sent</h1>
                <p className="mt-2 text-sm text-pasha-muted leading-relaxed">
                  We&apos;ve sent a password reset link to{" "}
                  <span className="font-medium text-pasha-ink">{email}</span>. Open it to set a
                  new password. Don&apos;t forget to check your spam folder.
                </p>
                <button
                  type="button"
                  onClick={toSignIn}
                  className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full bg-pasha-red px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-pasha-red-dark transition-colors"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
            <div className="w-10 h-10 rounded-lg bg-pasha-red/10 grid place-items-center mb-5">
              <ShieldCheck className="w-5 h-5 text-pasha-red" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl tracking-tight text-pasha-ink">
              {forgot ? "Reset your password" : "Committee sign-in"}
            </h1>
            <p className="mt-2 text-sm text-pasha-muted leading-relaxed">
              {forgot
                ? "Enter your committee email and we'll send a link to set a new password."
                : "Restricted to authorised committee members. Your email must be in the committee allowlist."}
            </p>

            {error && (
              <div className="mt-5 rounded-lg border border-pasha-red/30 bg-pasha-red/[0.04] p-3 flex items-start gap-2.5 text-xs text-pasha-red">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {forgot ? (
                <form onSubmit={sendReset} className="mt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-pasha-ink">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="you@pasha.org.pk"
                      className="mt-1.5 h-11 w-full rounded-lg border border-pasha-line bg-white px-3.5 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-pasha-red px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-pasha-red-dark transition-colors disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      "Send reset link"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={toSignIn}
                    className="block w-full text-center text-sm font-medium text-pasha-red hover:text-pasha-red-dark transition-colors"
                  >
                    Back to sign in
                  </button>
                </form>
            ) : (
              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-pasha-ink">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@pasha.org.pk"
                    className="mt-1.5 h-11 w-full rounded-lg border border-pasha-line bg-white px-3.5 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-pasha-ink">Password</label>
                    <button
                      type="button"
                      onClick={toForgot}
                      className="text-xs font-medium text-pasha-red hover:text-pasha-red-dark transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    wrapperClassName="mt-1.5"
                    className="h-11 w-full rounded-lg border border-pasha-line bg-white px-3.5 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-pasha-red px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-pasha-red-dark transition-colors disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>
            )}
              </>
            )}
          </motion.div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

export function AdminLoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
