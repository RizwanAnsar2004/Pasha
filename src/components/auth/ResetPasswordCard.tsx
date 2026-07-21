"use client";

// Shared "set a new password" card for the recovery flow.

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { KeyRound, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/ui/PasswordInput";

export function ResetPasswordCard({
  loginHref,
  minLength = 8,
}: {
  loginHref: string;
  minLength?: number;
}) {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setChecking(false);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < minLength) {
      setError(`Password must be at least ${minLength} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw new Error(updErr.message);
      // Sign out the recovery session so they re-authenticate with the new password through the normal login.
      await supabase.auth.signOut();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-pasha-line bg-white p-8 shadow-sm"
    >
      <div className="w-10 h-10 rounded-lg bg-pasha-red/10 grid place-items-center mb-5">
        <KeyRound className="w-5 h-5 text-pasha-red" />
      </div>

      {checking ? (
        <div className="flex items-center gap-2 text-sm text-pasha-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          Verifying your reset link…
        </div>
      ) : done ? (
        <div>
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            <h1 className="font-serif text-2xl tracking-tight text-pasha-ink">Password updated</h1>
          </div>
          <p className="mt-2 text-sm text-pasha-muted leading-relaxed">
            Your password has been changed. You can now sign in with your new password.
          </p>
          <Link
            href={loginHref}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-pasha-red px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-pasha-red-dark transition-colors"
          >
            Go to sign in
          </Link>
        </div>
      ) : !hasSession ? (
        <div>
          <h1 className="font-serif text-2xl tracking-tight text-pasha-ink">Reset link expired</h1>
          <p className="mt-2 text-sm text-pasha-muted leading-relaxed">
            This password reset link is invalid or has expired. Request a new one from the
            sign-in page.
          </p>
          <Link
            href={loginHref}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-pasha-line bg-white px-5 py-2.5 text-sm font-medium text-pasha-ink hover:border-pasha-red hover:text-pasha-red transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <div>
          <h1 className="font-serif text-2xl tracking-tight text-pasha-ink">Set a new password</h1>
          <p className="mt-2 text-sm text-pasha-muted leading-relaxed">
            Choose a new password for your account.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-pasha-ink">New password</label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={minLength}
                autoComplete="new-password"
                placeholder="••••••••"
                wrapperClassName="mt-1.5"
                className="h-11 w-full rounded-lg border border-pasha-line bg-white px-3.5 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15"
              />
              <p className="mt-1.5 text-xs text-pasha-muted">At least {minLength} characters.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-pasha-ink">Confirm password</label>
              <PasswordInput
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                wrapperClassName="mt-1.5"
                className="h-11 w-full rounded-lg border border-pasha-line bg-white px-3.5 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15"
              />
            </div>
            {error && (
              <div className="rounded-lg border border-pasha-red/30 bg-pasha-red/[0.04] p-3 flex items-start gap-2.5 text-xs text-pasha-red">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-pasha-red px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-pasha-red-dark transition-colors disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating…
                </>
              ) : (
                "Update password"
              )}
            </button>
          </form>
        </div>
      )}
    </motion.div>
  );
}
