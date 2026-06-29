"use client";

import { useCallback, useState } from "react";
import { format } from "date-fns";
import { Download, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";
import { Pagination } from "../_components/Pagination";
import { useListNav } from "../_components/useListNav";
import { ShimmerOverlay } from "../_components/ShimmerOverlay";
import { toCsv, downloadCsv, fetchAllForExport } from "@/lib/csv";

export type ActivityType =
  | "verification"
  | "report"
  | "program"
  | "event"
  | "update"
  | "initiative";

export type ActivityRow = {
  id: string;
  title: string;
  type: ActivityType;
  description: string;
  status: string;
  author_email: string | null;
  created_at: string;
};

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "verification", label: "Verification" },
  { value: "report", label: "Report" },
  { value: "program", label: "Program" },
  { value: "event", label: "Event" },
  { value: "update", label: "Update" },
  { value: "initiative", label: "Initiative" },
];

const TYPE_STYLES: Record<ActivityType, { badge: string; date: string }> = {
  verification: {
    badge: "bg-emerald-50 text-emerald-700",
    date: "text-emerald-600",
  },
  report: {
    badge: "bg-teal-50 text-teal-700",
    date: "text-teal-600",
  },
  program: {
    badge: "bg-orange-50 text-orange-700",
    date: "text-orange-600",
  },
  event: {
    badge: "bg-red-50 text-red-700",
    date: "text-red-600",
  },
  update: {
    badge: "bg-sky-50 text-sky-700",
    date: "text-sky-600",
  },
  initiative: {
    badge: "bg-violet-50 text-violet-700",
    date: "text-violet-600",
  },
};

const inputCls =
  "w-full rounded-lg border border-pasha-line bg-white px-3 py-2.5 text-sm text-pasha-ink placeholder:text-pasha-muted/70 focus:outline-none focus:border-pasha-red focus:ring-2 focus:ring-pasha-red/10";

function typeLabel(type: ActivityType) {
  return ACTIVITY_TYPES.find((t) => t.value === type)?.label ?? type;
}

function authorDisplay(email: string | null) {
  if (!email) return "Committee";
  const local = email.split("@")[0] ?? email;
  const parts = local.replace(/[._-]/g, " ").trim().split(/\s+/);
  if (parts.length >= 2) {
    return parts
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
  }
  return local.charAt(0).toUpperCase() + local.slice(1);
}

async function api(method: string, body?: unknown) {
  const res = await fetch("/api/admin/committee-activity", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

type FormState = {
  title: string;
  type: ActivityType;
  description: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  type: "verification",
  description: "",
};

export function CommitteeActivityClient({
  initial,
  total,
  page,
  pageSize,
}: {
  initial: ActivityRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const { isPending, setParams } = useListNav();
  const [rows, setRows] = useState<ActivityRow[]>(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setRows(initial);
  }
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ActivityRow | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setMsg(null);
  };

  const openEdit = (row: ActivityRow) => {
    setEditingId(row.id);
    setForm({
      title: row.title,
      type: row.type,
      description: row.description,
    });
    setShowForm(true);
    setMsg(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMsg(null);
  };

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

  const saveActivity = () =>
    run(async () => {
      if (!form.title.trim() || !form.description.trim()) {
        throw new Error("Title and description are required");
      }
      if (editingId) {
        const { activity } = await api("PATCH", { id: editingId, ...form });
        setRows((prev) => prev.map((r) => (r.id === editingId ? activity : r)));
        closeForm();
      } else {
        const { activity } = await api("POST", form);
        setRows((prev) => [activity, ...prev]);
        closeForm();
      }
    });

  const confirmDeleteActivity = () =>
    run(async () => {
      if (!deleteTarget) return;
      const row = deleteTarget;
      await api("DELETE", { id: row.id });
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      if (editingId === row.id) closeForm();
      setDeleteTarget(null);
    });

  const [exporting, setExporting] = useState(false);

  // Export every activity (all pages), not just the page on screen.
  const exportCSV = async () => {
    const cols = ["date", "type", "title", "description", "status", "author"];
    setExporting(true);
    try {
      const data = await fetchAllForExport("/api/admin/committee-activity");
      const allRows = (data.activities as ActivityRow[]) ?? [];
      const csv = toCsv(
        cols,
        allRows.map((r) => [
          format(new Date(r.created_at), "yyyy-MM"),
          typeLabel(r.type),
          r.title,
          r.description,
          r.status,
          r.author_email ?? "",
        ])
      );
      downloadCsv(`committee-activity-${Date.now()}.csv`, csv);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not export CSV.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl text-pasha-ink">Committee Activity</h1>
          <p className="mt-1 text-sm text-pasha-muted">
            Manage the public committee timeline and monthly updates.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={exportCSV}
            disabled={rows.length === 0 || exporting}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-pasha-line bg-white px-3.5 text-sm font-medium text-pasha-ink hover:bg-pasha-stone/60 transition-colors disabled:opacity-40"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export
          </button>
          <button
            type="button"
            onClick={() => (showForm && !editingId ? closeForm() : openCreate())}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-pasha-red px-5 text-sm font-medium text-white hover:bg-pasha-red-dark transition-colors"
          >
            {showForm && !editingId ? (
              <>
                <X className="w-4 h-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                New Activity
              </>
            )}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-pasha-line bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-pasha-ink">
            {editingId ? "Edit Committee Activity" : "New Committee Activity"}
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-pasha-ink">
              Title <span className="text-pasha-red">*</span>
              <input
                className={cn(inputCls, "mt-1.5")}
                placeholder="Activity title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </label>
            <label className="block text-sm text-pasha-ink">
              Type
              <SelectMenu
                className="mt-1.5 w-full"
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, type: v as ActivityType }))
                }
                options={ACTIVITY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              />
            </label>
          </div>

          <label className="mt-4 block text-sm text-pasha-ink">
            Description
            <textarea
              className={cn(inputCls, "mt-1.5 min-h-[120px] resize-y")}
              placeholder="Brief description for the public timeline…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={saveActivity}
              className="inline-flex items-center gap-1.5 rounded-lg bg-pasha-red px-5 py-2.5 text-sm font-medium text-white hover:bg-pasha-red-dark transition-colors disabled:opacity-50"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? "Save changes" : "Save Activity"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={closeForm}
              className="inline-flex items-center gap-1.5 rounded-lg border border-pasha-line bg-white px-5 py-2.5 text-sm font-medium text-pasha-ink hover:bg-pasha-stone/60 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            {msg && <span className="text-sm text-pasha-muted">{msg}</span>}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-pasha-line bg-white shadow-sm overflow-hidden relative">
        <ShimmerOverlay active={isPending} />
        <div className="border-b border-pasha-line px-6 py-5">
          <h2 className="text-base font-semibold text-pasha-ink">Activity Timeline</h2>
          <p className="mt-0.5 text-sm text-pasha-muted">
            {total} {total === 1 ? "entry" : "entries"}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-pasha-muted">No activities yet.</p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-3 text-sm font-medium text-pasha-red hover:text-pasha-red-dark"
            >
              Create the first activity
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-pasha-line">
            {rows.map((row) => {
              const styles = TYPE_STYLES[row.type];
              return (
                <li
                  key={row.id}
                  className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          styles.date
                        )}
                      >
                        {format(new Date(row.created_at), "MMM yyyy")}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          styles.badge
                        )}
                      >
                        {typeLabel(row.type)}
                      </span>
                      <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 capitalize">
                        {row.status}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-pasha-ink line-clamp-1 break-words">{row.title}</h3>
                    <p className="mt-1 text-sm text-pasha-muted leading-relaxed line-clamp-2 break-words">
                      {row.description}
                    </p>
                    <p className="mt-2 text-xs text-pasha-muted/80">
                      by {authorDisplay(row.author_email)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-start">
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      aria-label={`Edit ${row.title}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(row)}
                      disabled={busy}
                      aria-label={`Delete ${row.title}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Pagination
          total={total}
          page={page}
          pageSize={pageSize}
          setParams={setParams}
          isPending={isPending}
        />
      </div>

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title="Delete activity?"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.title}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        busy={busy}
        onConfirm={confirmDeleteActivity}
        onCancel={() => !busy && setDeleteTarget(null)}
      />
    </div>
  );
}
