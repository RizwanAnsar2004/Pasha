"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Trash2, UserPlus, Users } from "lucide-react";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";

type MemberRow = {
  email: string;
  added_at: string;
  added_by: string | null;
  roles: string | null;
};

export function CommitteeManagementClient({ initial }: { initial: MemberRow[] }) {
  const [rows, setRows] = useState<MemberRow[]>(initial);
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/committee-members", { cache: "no-store" });
    const j = await res.json();
    setRows(j.members ?? []);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setAdding(true);
    try {
      const res = await fetch("/api/admin/committee-members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          roles: roles.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not add committee member");
      setSuccess(`Added ${j.email}. They can now sign in to /admin.`);
      setEmail("");
      setRoles("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add committee member");
    } finally {
      setAdding(false);
    }
  }

  async function confirmRemove() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setError(null);
    setSuccess(null);
    setRemovingEmail(target);
    try {
      const res = await fetch("/api/admin/committee-members", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not remove committee member");
      setSuccess(`Removed ${target}.`);
      setDeleteTarget(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove committee member");
    } finally {
      setRemovingEmail(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-pasha-ink">Committee Management</h1>
        <p className="mt-1 text-sm text-pasha-muted max-w-3xl">
          Manage committee members who can access the admin portal and maintain
          committee activities.
        </p>
      </div>

      {(error || success) && (
        <div
          className={
            "rounded-lg border px-4 py-3 text-sm flex items-start gap-2 " +
            (error
              ? "border-pasha-red/30 bg-pasha-red/4 text-pasha-red"
              : "border-tier-featured/30 bg-tier-featured/6 text-tier-featured")
          }
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error ?? success}</span>
        </div>
      )}

      <section className="rounded-2xl border border-pasha-line bg-white p-6">
        <h2 className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-red">
          Add committee member
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
              value={roles}
              onChange={(e) => setRoles(e.target.value)}
              placeholder="Current role (optional)"
              className="h-11 rounded-lg border border-pasha-line bg-white px-3.5 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15"
            />
            <button
              type="submit"
              disabled={adding}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-pasha-red px-4 h-11 text-sm font-medium text-white shadow-sm hover:bg-pasha-red-dark transition-colors disabled:opacity-50"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Add
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-pasha-line bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-pasha-line flex items-center gap-2">
          <Users className="w-4 h-4 text-pasha-red" />
          <h2 className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-red">
            Current members ({rows.length})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-pasha-stone/40 border-b border-pasha-line">
            <tr className="text-left">
              <Th>Email</Th>
              <Th>Roles</Th>
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
                  <span className="text-xs text-pasha-muted">{r.roles ?? "—"}</span>
                </Td>
                <Td>
                  <span className="text-xs text-pasha-muted">
                    {r.added_at ? new Date(r.added_at).toLocaleDateString("en-PK") : "—"}
                  </span>
                </Td>
                <Td>
                  <span className="text-xs text-pasha-muted">{r.added_by ?? "—"}</span>
                </Td>
                <Td>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(r.email)}
                    disabled={removingEmail === r.email}
                    className="inline-flex items-center gap-1.5 rounded-md border border-pasha-line bg-white px-2.5 py-1 text-[11px] font-medium text-pasha-red hover:bg-pasha-red/4 disabled:opacity-50 transition-colors"
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
                  No committee members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title="Remove committee member?"
        description={
          deleteTarget
            ? `Remove ${deleteTarget} from committee management access? They will no longer be able to sign in to /admin.`
            : ""
        }
        confirmLabel="Remove"
        busy={removingEmail !== null}
        onConfirm={confirmRemove}
        onCancel={() => !removingEmail && setDeleteTarget(null)}
      />
    </div>
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
