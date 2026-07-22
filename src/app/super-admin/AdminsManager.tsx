"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { ApiUnauthorizedHandler } from "@/components/ApiUnauthorizedHandler";
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  Loader2,
  LogOut,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export type AdminRow = {
  email: string;
  added_at: string;
  added_by: string | null;
  notes: string | null;
};

export function AdminsManager({
  subject,
  initial,
}: {
  subject: string;
  initial: AdminRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<AdminRow[]>(initial);
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function refresh() {
    const j = await api.get<{ admins?: typeof rows }>(ENDPOINTS.superAdmin.admins);
    setRows(j.admins ?? []);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setAdding(true);
    try {
      const j = await api.post<{ email: string }>(ENDPOINTS.superAdmin.admins, {
        email: email.trim().toLowerCase(),
        notes: notes.trim() || undefined,
      });
      setSuccess(`Added ${j.email}. They can now sign in at /admin/login.`);
      setEmail("");
      setNotes("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add admin");
    } finally {
      setAdding(false);
    }
  }

  async function remove(target: string) {
    if (
      !confirm(
        `Remove ${target} from the admin allowlist? They'll lose access to /admin immediately.`
      )
    ) {
      return;
    }
    setError(null);
    setSuccess(null);
    setRemovingEmail(target);
    try {
      await api.del(ENDPOINTS.superAdmin.admins, { email: target });
      setSuccess(`Removed ${target}.`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove admin");
    } finally {
      setRemovingEmail(null);
    }
  }

  async function signOut() {
    await api.del(ENDPOINTS.superAdmin.auth);
    router.replace("/super-admin/login");
  }

  return (
    <main className="min-h-screen bg-pasha-stone/30">
      <ApiUnauthorizedHandler realm="super-admin" />
      <header className="border-b border-pasha-line bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-pasha-red" />
            <span className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-muted">
              Super admin
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:block text-pasha-muted">{subject}</span>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 text-xs text-pasha-muted hover:text-pasha-red transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 sm:px-8 py-10 space-y-8">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl tracking-tight text-pasha-ink">
            Manage admins
          </h1>
          <p className="mt-2 text-sm text-pasha-muted max-w-xl leading-relaxed">
            Anyone in this list can sign into the regular admin panel at
            <a
              href="/admin"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-pasha-red mx-1 hover:underline"
            >
              /admin <ExternalLink className="w-3 h-3" />
            </a>
            via magic-link email. Adding someone here also pre-creates their
            Supabase auth account so their first sign-in works in one click.
          </p>
        </div>

        {(error || success) && (
          <div
            className={
              "rounded-lg border px-4 py-3 text-sm flex items-start gap-2 " +
              (error
                ? "border-pasha-red/30 bg-pasha-red/[0.04] text-pasha-red"
                : "border-tier-featured/30 bg-tier-featured/[0.06] text-tier-featured")
            }
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error ?? success}</span>
          </div>
        )}

        <section className="rounded-2xl border border-pasha-line bg-white p-6">
          <h2 className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-red">
            Add an admin
          </h2>
          <form onSubmit={add} className="mt-4 space-y-3">
            <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="person@pasha.org.pk"
                className="h-11 rounded-lg border border-pasha-line bg-white px-3.5 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15"
              />
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Role / notes (optional)"
                className="h-11 rounded-lg border border-pasha-line bg-white px-3.5 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15"
              />
              <button
                type="submit"
                disabled={adding}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-pasha-red px-4 h-11 text-sm font-medium text-white shadow-sm hover:bg-pasha-red-dark transition-colors disabled:opacity-50"
              >
                {adding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Add
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-pasha-line bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-pasha-line">
            <h2 className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-red">
              Current admins ({rows.length})
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-pasha-stone/40 border-b border-pasha-line">
              <tr className="text-left">
                <Th>Email</Th>
                <Th>Notes</Th>
                <Th>Added</Th>
                <Th>Added by</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.email}
                  className="border-b border-pasha-line/60 last:border-0 hover:bg-pasha-stone/40"
                >
                  <Td>
                    <span className="font-medium text-pasha-ink">{r.email}</span>
                  </Td>
                  <Td>
                    <span className="text-xs text-pasha-muted">
                      {r.notes ?? "—"}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs text-pasha-muted">
                      {r.added_at
                        ? new Date(r.added_at).toLocaleDateString("en-PK")
                        : "—"}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs text-pasha-muted">
                      {r.added_by ?? "—"}
                    </span>
                  </Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => remove(r.email)}
                      disabled={removingEmail === r.email}
                      className="inline-flex items-center gap-1.5 rounded-md border border-pasha-line bg-white px-2.5 py-1 text-[11px] font-medium text-pasha-red hover:bg-pasha-red/[0.04] disabled:opacity-50 transition-colors"
                    >
                      {removingEmail === r.email ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      Remove
                    </button>
                  </Td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-pasha-muted text-sm">
                    No admins yet. Add at least one above so someone can sign into{" "}
                    <a href="/admin" className="text-pasha-red hover:underline">
                      /admin
                    </a>
                    .
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[2px] text-pasha-muted">
      {children}
    </th>
  );
}
function Td({ children }: { children?: React.ReactNode }) {
  return <td className="px-4 py-3 align-top">{children}</td>;
}
