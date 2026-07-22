"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, apiErrorMessage } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { PasswordInput } from "@/components/ui/PasswordInput";

export function SuperAdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post(ENDPOINTS.superAdmin.auth, { email, password });
      router.replace("/super-admin");
    } catch (e) {
      setError(apiErrorMessage(e, "Sign-in failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-pasha-stone/40 grid place-items-center px-5">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-pasha-line bg-white p-8 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-pasha-red/10 grid place-items-center mb-5">
            <ShieldCheck className="w-5 h-5 text-pasha-red" />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl tracking-tight text-pasha-ink">
            Super admin
          </h1>
          <p className="mt-2 text-sm text-pasha-muted leading-relaxed">
            Manage the admin allowlist for the P@SHA Startup Hub. This
            account is hardcoded — no magic links, no recovery flow.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-pasha-ink">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                placeholder="admin@pasha.org.pk"
                className="mt-1.5 h-11 w-full rounded-lg border border-pasha-line bg-white px-3.5 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-pasha-ink">
                Password
              </label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
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
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
