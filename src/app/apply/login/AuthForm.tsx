"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Rocket, Loader2, AlertCircle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

function AuthInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const redirect = sp.get("redirect") ?? "/apply";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    sp.get("error") === "admin"
      ? "You're signed in with a committee/admin account, which can't be used to apply. Sign out of the admin portal, or sign in with a separate applicant account below."
      : null
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/applicant/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: mode, email, password }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Something went wrong");
      router.replace(redirect);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-pasha-stone/30">
        <div className="mx-auto max-w-md px-5 sm:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-pasha-line bg-white p-8 shadow-sm"
          >
            <div className="w-10 h-10 rounded-lg bg-pasha-red/10 grid place-items-center mb-5">
              <Rocket className="w-5 h-5 text-pasha-red" />
            </div>
            <h1 className="font-serif text-3xl tracking-tight text-pasha-ink">
              {isRegister ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-2 text-sm text-pasha-muted leading-relaxed">
              {isRegister
                ? "Create an account to start your application. You can save your progress and finish it later — your answers are kept against your account."
                : "Sign in to continue your application. You can pick up right where you left off."}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-pasha-ink">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@startup.com"
                  className="mt-1.5 h-11 w-full rounded-lg border border-pasha-line bg-white px-3.5 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-pasha-ink">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isRegister ? 8 : undefined}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  placeholder="••••••••"
                  className="mt-1.5 h-11 w-full rounded-lg border border-pasha-line bg-white px-3.5 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15"
                />
                {isRegister && (
                  <p className="mt-1.5 text-xs text-pasha-muted">At least 8 characters.</p>
                )}
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
                    {isRegister ? "Creating account…" : "Signing in…"}
                  </>
                ) : isRegister ? (
                  "Create account"
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-pasha-muted">
              {isRegister ? "Already have an account?" : "New here?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(isRegister ? "login" : "register");
                  setError(null);
                }}
                className="font-medium text-pasha-red hover:text-pasha-red-dark transition-colors"
              >
                {isRegister ? "Sign in" : "Create an account"}
              </button>
            </p>
          </motion.div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

export function ApplyAuthForm() {
  return (
    <Suspense fallback={null}>
      <AuthInner />
    </Suspense>
  );
}
