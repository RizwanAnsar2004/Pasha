"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2, Loader2, X, ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import { Pagination } from "../_components/Pagination";
import { api } from "@/lib/api/client";

export type OptionItem = { value: string; label: string };
export type OptionListMeta = {
  name: string;
  label: string;
  items: OptionItem[];
  source: "code" | "db" | "override";
};

const inputCls =
  "w-full rounded-lg border border-pasha-line bg-white px-3 py-2 text-sm text-pasha-ink focus:outline-none focus:border-pasha-red";

// --- Row model ---------------------------------------------------------------
// Each editor row carries a stable React id, the visible label, and (for options
// that already exist in the DB) the locked stored key. Locked rows keep their
// key so editing the label just renames it; new rows derive their key from the
// label on save, so admins never have to think about keys.
type Row = { id: number; value: string; label: string; locked: boolean };

let ridSeq = 0;
const mkRow = (init: Partial<Row> = {}): Row => ({
  id: ++ridSeq,
  value: "",
  label: "",
  locked: false,
  ...init,
});

const rowsFromItems = (items: OptionItem[]): Row[] =>
  items.map((it) => mkRow({ value: it.value, label: it.label, locked: true }));

// Drop blank rows; new rows use their label as the key (matches the old
// "value === label" default), locked rows keep their original key.
const rowsToItems = (rows: Row[]): OptionItem[] =>
  rows
    .map((r) => ({ label: r.label.trim(), value: (r.locked ? r.value : r.label).trim() }))
    .filter((it) => it.label && it.value);

const call = (method: "POST" | "PATCH" | "DELETE", body: unknown) =>
  method === "POST"
    ? api.post("/api/admin/option-lists", body)
    : method === "PATCH"
      ? api.patch("/api/admin/option-lists", body)
      : api.del("/api/admin/option-lists", body);

export function OptionListsClient({
  initial,
  total,
  page,
  pageSize,
}: {
  initial: OptionListMeta[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const router = useRouter();
  // Render the server-provided page slice directly.
  const lists = initial;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRows, setNewRows] = useState<Row[]>(() => [mkRow(), mkRow(), mkRow()]);
  // List pending delete confirmation (drives the modal).
  const [confirmDelete, setConfirmDelete] = useState<OptionListMeta | null>(null);

  const refresh = useCallback(async () => {
    router.refresh();
  }, [router]);

  const run = useCallback(async (fn: () => Promise<void>, okMsg?: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      if (okMsg) setMsg(okMsg);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }, []);

  const saveList = (meta: OptionListMeta, items: OptionItem[]) =>
    run(async () => {
      // A code list with no DB row yet → create an override (POST); otherwise update the existing DB row (PATCH).
      const method = meta.source === "code" ? "POST" : "PATCH";
      await call(method, { name: meta.name, label: meta.label, items });
      await refresh();
    }, "Saved");

  const deleteList = (meta: OptionListMeta) => setConfirmDelete(meta);

  const confirmDeleteList = () =>
    run(async () => {
      if (!confirmDelete) return;
      const name = confirmDelete.name;
      setConfirmDelete(null);
      await call("DELETE", { name });
      await refresh();
    }, "Deleted");

  const cancelCreate = () => {
    setCreating(false);
    setNewName("");
    setNewRows([mkRow(), mkRow(), mkRow()]);
    setMsg(null);
  };

  const createList = () =>
    run(async () => {
      await call("POST", { name: newName.trim(), label: newName.trim(), items: rowsToItems(newRows) });
      cancelCreate();
      await refresh();
    }, "Created");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setCreating((c) => !c)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-pasha-ink px-4 py-2 text-sm text-white hover:bg-pasha-red transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> New list
        </button>
        {busy && <Loader2 className="w-4 h-4 animate-spin text-pasha-muted" />}
        {msg && <span className="text-sm text-pasha-muted">{msg}</span>}
      </div>

      {creating && (
        <div className="rounded-xl border border-pasha-red/30 bg-white p-4 space-y-4">
          <label className="block text-[11px] text-pasha-muted">
            List name (referenced by fields)
            <input
              className={inputCls + " mt-1 min-w-[200px] font-mono"}
              placeholder="e.g. PRODUCT_CATEGORIES"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </label>

          <div>
            <span className="block text-[11px] text-pasha-muted mb-2">Options</span>
            <RowsEditor rows={newRows} setRows={setNewRows} busy={busy} />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={busy || !newName.trim() || rowsToItems(newRows).length === 0}
              onClick={createList}
              className="inline-flex items-center gap-1.5 rounded-lg bg-pasha-ink px-3 py-2 text-sm text-white hover:bg-pasha-red disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" /> Create list
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={cancelCreate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-pasha-line px-3 py-2 text-sm text-pasha-muted hover:border-pasha-ink/20 hover:text-pasha-ink disabled:opacity-50"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {lists.map((meta) => (
          <ListCard
            key={meta.name}
            meta={meta}
            busy={busy}
            onSave={saveList}
            onDelete={deleteList}
          />
        ))}
      </div>

      <div className="rounded-xl border border-pasha-line bg-white overflow-hidden">
        <Pagination total={total} page={page} pageSize={pageSize} />
      </div>

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => setConfirmDelete(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-list-title"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pasha-red/10 text-pasha-red">
                <Trash2 className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <h2 id="delete-list-title" className="text-base font-semibold text-pasha-ink">
                  Delete “{confirmDelete.name}”?
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-pasha-muted">
                  All {confirmDelete.items.length} options in this list will be deactivated. New
                  entries won&apos;t offer them, but records already using them keep their label.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-pasha-line px-4 py-2 text-sm text-pasha-ink hover:border-pasha-ink/30 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={confirmDeleteList}
                className="inline-flex items-center gap-1.5 rounded-lg bg-pasha-red px-4 py-2 text-sm font-semibold text-white hover:bg-pasha-red-dark disabled:opacity-50"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Delete list
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Structured, one-input-per-option editor shared by the create form and each list.
function RowsEditor({
  rows,
  setRows,
  busy,
}: {
  rows: Row[];
  setRows: React.Dispatch<React.SetStateAction<Row[]>>;
  busy: boolean;
}) {
  const updateLabel = (id: number, label: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, label } : r)));
  const removeRow = (id: number) => setRows((rs) => rs.filter((r) => r.id !== id));
  const addRow = () => setRows((rs) => [...rs, mkRow()]);
  const moveRow = (id: number, dir: -1 | 1) =>
    setRows((rs) => {
      const i = rs.findIndex((r) => r.id === id);
      const j = i + dir;
      if (i === -1 || j < 0 || j >= rs.length) return rs;
      const next = [...rs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // Pressing Enter in a row adds a new one and moves focus to it.
  const onEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    addRow();
    // Focus the freshly-added input after React renders it.
    const wrap = e.currentTarget.closest("[data-rows-editor]");
    requestAnimationFrame(() => {
      const inputs = wrap?.querySelectorAll<HTMLInputElement>("input[data-option-input]");
      inputs?.[inputs.length - 1]?.focus();
    });
  };

  return (
    <div className="space-y-2" data-rows-editor>
      {rows.length === 0 && (
        <p className="text-xs text-pasha-muted">No options yet — add the first one below.</p>
      )}
      {rows.map((r, i) => (
        <div key={r.id} className="group flex items-center gap-2">
          <span className="w-5 text-right text-[11px] text-pasha-muted tabular-nums">{i + 1}</span>
          <input
            data-option-input
            className={inputCls}
            placeholder="Type an option…"
            value={r.label}
            onChange={(e) => updateLabel(r.id, e.target.value)}
            onKeyDown={onEnter}
            disabled={busy}
          />
          <div className="flex shrink-0 items-center gap-1 opacity-40 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => moveRow(r.id, -1)}
              disabled={busy || i === 0}
              title="Move up"
              className="grid h-8 w-8 place-items-center rounded-lg border border-pasha-line text-pasha-muted hover:border-pasha-ink/30 hover:text-pasha-ink disabled:opacity-30"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => moveRow(r.id, 1)}
              disabled={busy || i === rows.length - 1}
              title="Move down"
              className="grid h-8 w-8 place-items-center rounded-lg border border-pasha-line text-pasha-muted hover:border-pasha-ink/30 hover:text-pasha-ink disabled:opacity-30"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => removeRow(r.id)}
              disabled={busy}
              title="Remove option"
              className="grid h-8 w-8 place-items-center rounded-lg border border-pasha-line text-pasha-muted hover:border-pasha-red hover:text-pasha-red disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        disabled={busy}
        className="inline-flex items-center gap-1.5 pl-7 text-sm font-medium text-pasha-red hover:text-pasha-red-dark disabled:opacity-50"
      >
        <Plus className="w-4 h-4" /> Add option
      </button>
      <p className="pl-7 text-[11px] text-pasha-muted">Tip: press Enter to add the next option.</p>
    </div>
  );
}

function ListCard({
  meta,
  busy,
  onSave,
  onDelete,
}: {
  meta: OptionListMeta;
  busy: boolean;
  onSave: (meta: OptionListMeta, items: OptionItem[]) => void;
  onDelete: (meta: OptionListMeta) => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => rowsFromItems(meta.items));
  const [open, setOpen] = useState(false);

  const badge =
    meta.source === "code"
      ? { label: "Not yet saved", cls: "bg-pasha-stone text-pasha-ink/70" }
      : { label: "Live", cls: "bg-green-600/10 text-green-700" };

  const count = rowsToItems(rows).length;

  return (
    <div className="rounded-xl border border-pasha-line bg-white overflow-hidden">
      {/* Accordion header — click to expand/collapse */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-pasha-stone/40 transition-colors"
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <ChevronRight
            className={`w-4 h-4 shrink-0 text-pasha-muted transition-transform ${open ? "rotate-90" : ""}`}
          />
          <span className="font-mono text-sm font-semibold text-pasha-ink break-all">{meta.name}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>
            {badge.label}
          </span>
        </div>
        <span className="shrink-0 text-[11px] text-pasha-muted">{count} options</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-pasha-line px-4 pb-4 pt-3">
          <RowsEditor rows={rows} setRows={setRows} busy={busy} />

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => onSave(meta, rowsToItems(rows))}
              className="inline-flex items-center gap-1.5 rounded-lg bg-pasha-ink px-3 py-2 text-sm text-white hover:bg-pasha-red disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" /> {meta.source === "code" ? "Save & link" : "Save"}
            </button>
            {meta.source === "db" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onDelete(meta)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-pasha-line px-3 py-2 text-sm text-pasha-muted hover:border-pasha-red hover:text-pasha-red disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
