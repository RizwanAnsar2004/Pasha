"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2, Loader2, RotateCcw, Lock, X } from "lucide-react";
import { Pagination } from "../_components/Pagination";

export type OptionItem = { value: string; label: string };
export type OptionListMeta = {
  name: string;
  label: string;
  items: OptionItem[];
  source: "code" | "db" | "override";
};

const inputCls =
  "w-full rounded-lg border border-pasha-line bg-white px-3 py-2 text-sm text-pasha-ink focus:outline-none focus:border-pasha-red";

// Serialize items to "value | label" lines (collapsing when value === label).
function itemsToText(items: OptionItem[]): string {
  return items.map((o) => (o.value === o.label ? o.value : `${o.value} | ${o.label}`)).join("\n");
}

function textToItems(text: string): OptionItem[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf("|");
      if (idx === -1) return { value: line, label: line };
      const value = line.slice(0, idx).trim();
      const label = line.slice(idx + 1).trim();
      return { value, label: label || value };
    });
}

async function api(method: string, body: unknown) {
  const res = await fetch("/api/admin/option-lists", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

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
  // Render the server-provided page slice directly. Mutations re-run the server
  // component via router.refresh(), which re-slices the current page.
  const lists = initial;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newText, setNewText] = useState("");

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

  const saveList = (meta: OptionListMeta, text: string) =>
    run(async () => {
      const items = textToItems(text);
      // A code list with no DB row yet → create an override (POST); otherwise
      // update the existing DB row (PATCH).
      const method = meta.source === "code" ? "POST" : "PATCH";
      await api(method, { name: meta.name, label: meta.label, items });
      await refresh();
    }, "Saved");

  const deleteList = (meta: OptionListMeta) =>
    run(async () => {
      const revert = meta.source === "override";
      if (
        !confirm(
          revert
            ? `Remove your override of "${meta.name}"? It will revert to the built-in default.`
            : `Delete the list "${meta.name}"? Fields referencing it will have no options.`
        )
      )
        return;
      await api("DELETE", { name: meta.name });
      await refresh();
    }, "Done");

  const cancelCreate = () => {
    setCreating(false);
    setNewName("");
    setNewText("");
    setMsg(null);
  };

  const createList = () =>
    run(async () => {
      await api("POST", { name: newName.trim(), label: newName.trim(), items: textToItems(newText) });
      setCreating(false);
      setNewName("");
      setNewText("");
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
        <div className="rounded-xl border border-pasha-red/30 bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-[11px] text-pasha-muted">
              List name (referenced by fields)
              <input
                className={inputCls + " min-w-[200px] font-mono"}
                placeholder="e.g. PRODUCT_CATEGORIES"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </label>
          </div>
          <label className="text-[11px] text-pasha-muted block">
            Options — one per line. <span className="font-mono">value | label</span> to
            store a code but show friendlier text.
            <textarea
              className={inputCls + " mt-1 font-mono min-h-[120px]"}
              placeholder={"Hardware\nSoftware\nsvc | Venture Capital"}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy || !newName.trim()}
              onClick={createList}
              className="inline-flex items-center gap-1.5 rounded-lg border border-pasha-line px-3 py-2 text-sm hover:border-pasha-red hover:text-pasha-red disabled:opacity-50"
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
  onSave: (meta: OptionListMeta, text: string) => void;
  onDelete: (meta: OptionListMeta) => void;
}) {
  const [text, setText] = useState(itemsToText(meta.items));

  const badge =
    meta.source === "code"
      ? { label: "Built-in", cls: "bg-pasha-stone text-pasha-ink/70" }
      : meta.source === "override"
      ? { label: "Built-in · overridden", cls: "bg-amber-100 text-amber-700" }
      : { label: "Custom", cls: "bg-pasha-red/10 text-pasha-red" };

  return (
    <div className="rounded-xl border border-pasha-line bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-pasha-ink">{meta.name}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>
            {badge.label}
          </span>
          <span className="text-[11px] text-pasha-muted">{meta.items.length} options</span>
        </div>
        {meta.source === "code" && (
          <span className="inline-flex items-center gap-1 text-[11px] text-pasha-muted">
            <Lock className="w-3 h-3" /> Editing creates an override
          </span>
        )}
      </div>

      <textarea
        className={inputCls + " font-mono min-h-[110px]"}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onSave(meta, text)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-pasha-line px-3 py-2 text-sm hover:border-pasha-red hover:text-pasha-red disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {meta.source === "code" ? "Save as override" : "Save"}
        </button>
        {meta.source === "override" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(meta)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-pasha-line px-3 py-2 text-sm text-pasha-muted hover:border-pasha-red hover:text-pasha-red disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" /> Revert to built-in
          </button>
        )}
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
  );
}
