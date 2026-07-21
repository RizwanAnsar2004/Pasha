"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Loader2, Pencil, Search, Trash2, UserPlus, Users, X } from "lucide-react";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { Pagination } from "../_components/Pagination";
import { useListNav } from "../_components/useListNav";
import { ShimmerOverlay } from "../_components/ShimmerOverlay";
import type { MemberRow } from "./page";
import {
  COMMITTEE_MEMBER_TYPES,
  committeeMemberTypeLabel,
  type CommitteeMemberType,
} from "@/lib/committee";

const TYPE_BADGE: Record<CommitteeMemberType, string> = {
  chairman: "bg-pasha-red/8 text-pasha-red border-pasha-red/20",
  member: "bg-pasha-stone text-pasha-muted border-pasha-line",
  admin: "bg-sky-50 text-sky-700 border-sky-200",
};

// SelectMenu's option shape, derived from the shared committee vocabulary.
const TYPE_OPTIONS = COMMITTEE_MEMBER_TYPES.map((t) => ({
  value: t.value,
  label: t.label,
}));

// Shared field style for the edit dialog. Matches the "Add committee member"
// form so both paths feel like the same control set.
const fieldCls =
  "h-11 w-full min-w-0 rounded-lg border border-pasha-line bg-white px-3.5 text-sm text-pasha-ink focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15";

export function CommitteeManagementClient({
  initial,
  total,
  page,
  pageSize,
  initialQ,
  initialType,
  canOperate,
}: {
  initial: MemberRow[];
  total: number;
  page: number;
  pageSize: number;
  initialQ: string;
  initialType: string;
  canOperate: boolean;
}) {
  const { isPending, setParams } = useListNav();
  const [q, setQ] = useState(initialQ);
  useEffect(() => {
    if (q === initialQ) return;
    const t = setTimeout(() => setParams({ q: q || null, page: 1 }), 300);
    return () => clearTimeout(t);
  }, [q, initialQ, setParams]);
  const [rows, setRows] = useState<MemberRow[]>(initial);
  // Sync local row state when the server returns a fresh page — React's
  // "adjust state when a prop changes" pattern (set during render, not in an
  // effect) so it doesn't clobber on an extra render pass.
  const [syncedInitial, setSyncedInitial] = useState(initial);
  if (syncedInitial !== initial) {
    setSyncedInitial(initial);
    setRows(initial);
  }
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [roles, setRoles] = useState("");
  const [org, setOrg] = useState("");
  const [type, setType] = useState<CommitteeMemberType>("member");
  const [adding, setAdding] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRoles, setEditRoles] = useState("");
  const [editOrg, setEditOrg] = useState("");
  const [editType, setEditType] = useState<CommitteeMemberType>("member");
  const [savingEmail, setSavingEmail] = useState<string | null>(null);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Close the edit dialog on Escape, unless a save is in flight.
  useEffect(() => {
    if (editingEmail === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && savingEmail === null) setEditingEmail(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingEmail, savingEmail]);

  async function refresh() {
    const res = await fetch("/api/admin/committee-members", { cache: "no-store" });
    const j = await res.json();
    setRows(j.members ?? []);
  }

  function startEdit(row: MemberRow) {
    setEditingEmail(row.email);
    setEditName(row.name ?? "");
    setEditRoles(row.roles ?? "");
    setEditOrg(row.org ?? "");
    setEditType(row.type);
    setError(null);
    setSuccess(null);
  }

  // Only close — the field values are re-seeded by startEdit on every open, so
  // clearing them here would blank the dialog mid exit-animation.
  function cancelEdit() {
    setEditingEmail(null);
  }

  async function saveEdit(targetEmail: string) {
    setError(null);
    setSuccess(null);
    setSavingEmail(targetEmail);
    try {
      const res = await fetch("/api/admin/committee-members", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          name: editName.trim(),
          roles: editRoles.trim() || undefined,
          org: editOrg.trim(),
          type: editType,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not update committee member");
      setRows((prev) => prev.map((r) => (r.email === targetEmail ? j.member : r)));
      setSuccess(`Updated ${targetEmail}.`);
      cancelEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update committee member");
    } finally {
      setSavingEmail(null);
    }
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
          name: name.trim() || undefined,
          roles: roles.trim() || undefined,
          org: org.trim() || undefined,
          type,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not add committee member");
      if (j.emailed) {
        setSuccess(`Added ${j.email}. Their login email, role, and password have been emailed to them.`);
      } else if (j.password) {
        // Email couldn't be sent — show the password so the admin can share it
        // manually (otherwise the new member can't sign in).
        setSuccess(
          `Added ${j.email}, but the invite email could not be sent. Share these credentials manually — password: ${j.password}`
        );
      } else {
        setSuccess(`Added ${j.email}. They can now sign in to /admin.`);
      }
      setEmail("");
      setName("");
      setRoles("");
      setOrg("");
      setType("member");
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
      if (editingEmail === target) cancelEdit();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove committee member");
    } finally {
      setRemovingEmail(null);
    }
  }

  // The member being edited. Null while the dialog is closed — AnimatePresence
  // keeps the previous contents mounted for the exit animation.
  const editingRow =
    editingEmail === null ? null : rows.find((r) => r.email === editingEmail) ?? null;

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

      {!canOperate && (
        <div className="rounded-lg border border-pasha-line bg-pasha-stone/40 px-4 py-3 text-sm text-pasha-muted">
          You have view-only access. Only admins and chairmen can add, edit, or
          remove committee members.
        </div>
      )}

      {canOperate && (
      <section className="rounded-2xl border border-pasha-line bg-white p-6">
        <h2 className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-red">
          Add committee member
        </h2>
        <form onSubmit={add} className="mt-4 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="h-11 w-full min-w-0 text-ellipsis rounded-lg border border-pasha-line bg-white px-3.5 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email address"
              className="h-11 w-full min-w-0 text-ellipsis rounded-lg border border-pasha-line bg-white px-3.5 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15"
            />
            <input
              type="text"
              value={roles}
              onChange={(e) => setRoles(e.target.value)}
              placeholder="Role"
              className="h-11 w-full min-w-0 text-ellipsis rounded-lg border border-pasha-line bg-white px-3.5 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15"
            />
            <input
              type="text"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="Company"
              className="h-11 w-full min-w-0 text-ellipsis rounded-lg border border-pasha-line bg-white px-3.5 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15"
            />
            <SelectMenu
              value={type}
              onValueChange={(v) => setType(v as CommitteeMemberType)}
              aria-label="Member type"
              className="h-11 w-full"
              options={TYPE_OPTIONS}
            />
          </div>
          <p className="text-xs text-pasha-muted">
            A password is generated automatically and emailed to the member with their sign-in email and role.
          </p>
          <button
            type="submit"
            disabled={adding}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-pasha-red px-4 h-11 text-sm font-medium text-white shadow-sm hover:bg-pasha-red-dark transition-colors disabled:opacity-50"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Add
          </button>
        </form>
      </section>
      )}

      <section className="rounded-2xl border border-pasha-line bg-white overflow-hidden relative">
        <ShimmerOverlay active={isPending} />
        <div className="px-4 sm:px-6 py-4 border-b border-pasha-line flex flex-wrap items-center gap-3">
          <Users className="w-4 h-4 text-pasha-red shrink-0" />
          <h2 className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-red shrink-0">
            Current members ({total})
          </h2>
          <SelectMenu
            value={initialType || "all"}
            onValueChange={(v) => setParams({ type: v === "all" ? null : v, page: 1 })}
            aria-label="Filter by type"
            className="ml-auto h-9 w-44"
            options={[{ value: "all", label: "All types" }, ...TYPE_OPTIONS]}
          />
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-pasha-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search email, role, company…"
              className="h-9 w-full rounded-lg border border-pasha-line bg-white pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-pasha-stone/40 border-b border-pasha-line">
            <tr className="text-left">
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Type</Th>
              <Th>Role</Th>
              <Th>Company</Th>
              <Th>Added</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const busy = savingEmail === r.email || removingEmail === r.email;

              return (
                <tr
                  key={r.email}
                  className="border-b border-pasha-line/60 last:border-0 hover:bg-pasha-stone/40"
                >
                  <Td>
                    <span className="font-medium text-pasha-ink">{r.name || "—"}</span>
                  </Td>
                  <Td>
                    <span className="text-pasha-muted">{r.email}</span>
                  </Td>
                  <Td>
                    <span
                      className={
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium " +
                        TYPE_BADGE[r.type]
                      }
                    >
                      {committeeMemberTypeLabel(r.type)}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs text-pasha-muted">{r.roles ?? "—"}</span>
                  </Td>
                  <Td>
                    <span className="text-xs text-pasha-muted">{r.org || "—"}</span>
                  </Td>
                  <Td>
                    <span className="text-xs text-pasha-muted">
                      {r.added_at ? new Date(r.added_at).toLocaleDateString("en-PK") : "—"}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5 justify-end">
                      {canOperate && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(r)}
                            disabled={busy}
                            aria-label={`Edit ${r.email}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-pasha-line bg-white text-pasha-muted hover:text-pasha-ink hover:border-pasha-ink/30 disabled:opacity-50 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(r.email)}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-md border border-pasha-line bg-white px-2.5 py-1 text-[11px] font-medium text-pasha-red hover:bg-pasha-red/4 disabled:opacity-50 transition-colors"
                          >
                            {removingEmail === r.email ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-pasha-muted text-sm">
                  No committee members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <Pagination
          total={total}
          page={page}
          pageSize={pageSize}
          setParams={setParams}
          isPending={isPending}
        />
      </section>

      <AnimatePresence>
        {editingRow && (
          <>
            <motion.button
              key="edit-member-backdrop"
              type="button"
              aria-label="Close dialog"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => !savingEmail && cancelEdit()}
              className="fixed inset-0 z-50 h-[100vh] bg-pasha-ink/40 backdrop-blur-sm"
            />
            <motion.div
              key="edit-member-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-member-title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="pointer-events-auto flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-pasha-line bg-white shadow-xl"
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveEdit(editingRow.email);
                  }}
                  className="flex min-h-0 flex-col"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-pasha-line px-6 py-4">
                    <div className="min-w-0">
                      <h3
                        id="edit-member-title"
                        className="font-serif text-lg text-pasha-ink"
                      >
                        Edit committee member
                      </h3>
                      <p className="mt-0.5 truncate text-xs text-pasha-muted">
                        {editingRow.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={savingEmail !== null}
                      aria-label="Close"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-pasha-line bg-white text-pasha-muted hover:text-pasha-ink hover:border-pasha-ink/30 disabled:opacity-50 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                    <Field label="Full name">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Full name"
                        autoFocus
                        className={fieldCls}
                      />
                    </Field>
                    <Field label="Member type">
                      <SelectMenu
                        value={editType}
                        onValueChange={(v) => setEditType(v as CommitteeMemberType)}
                        aria-label="Member type"
                        className="h-11 w-full"
                        options={TYPE_OPTIONS}
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Role">
                        <input
                          type="text"
                          value={editRoles}
                          onChange={(e) => setEditRoles(e.target.value)}
                          placeholder="e.g. CEO"
                          className={fieldCls}
                        />
                      </Field>
                      <Field label="Company">
                        <input
                          type="text"
                          value={editOrg}
                          onChange={(e) => setEditOrg(e.target.value)}
                          placeholder="Company"
                          className={fieldCls}
                        />
                      </Field>
                    </div>
                    <p className="text-xs text-pasha-muted">
                      The email address is the member&rsquo;s sign-in identity and
                      can&rsquo;t be changed here. Remove and re-add the member to
                      move them to a different address.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-pasha-line bg-pasha-stone/30 px-6 py-4">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={savingEmail !== null}
                      className="rounded-lg border border-pasha-line bg-white px-5 py-2.5 text-sm font-medium text-pasha-ink hover:bg-pasha-stone/60 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingEmail !== null}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-pasha-red px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-pasha-red-dark disabled:opacity-50 transition-colors"
                    >
                      {savingEmail !== null && <Loader2 className="h-4 w-4 animate-spin" />}
                      Save changes
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[2px] text-pasha-muted">
        {label}
      </span>
      {children}
    </label>
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
