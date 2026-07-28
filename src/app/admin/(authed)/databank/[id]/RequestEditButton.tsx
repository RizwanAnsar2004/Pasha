"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, X, Loader2, CheckCircle2 } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type { OutlineSection } from "@/lib/startups/edit-requests/edit-requests";

// Admin action: ask a databank startup to fill/correct specific fields or whole
// sections. Opens a picker, then records an edit request + emails the startup.
export function RequestEditButton({
  databankId,
  startupName,
  outline,
}: {
  databankId: string;
  startupName: string | null;
  outline: OutlineSection[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [wholeForm, setWholeForm] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const totalFields = useMemo(
    () => outline.reduce((n, s) => n + s.fields.length, 0),
    [outline]
  );
  const selectedCount = wholeForm ? totalFields : selected.size;

  const isSectionFull = (s: OutlineSection) => s.fields.every((f) => selected.has(f.field_key));

  const toggleField = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSection = (s: OutlineSection) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const full = s.fields.every((f) => next.has(f.field_key));
      for (const f of s.fields) {
        if (full) next.delete(f.field_key);
        else next.add(f.field_key);
      }
      return next;
    });
  };

  const reset = () => {
    setWholeForm(false);
    setSelected(new Set());
    setNote("");
    setDueDate("");
    setError(null);
    setDone(false);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const submit = async () => {
    setError(null);
    if (!wholeForm && selected.size === 0) {
      setError("Pick at least one field, a section, or the whole form.");
      return;
    }
    // Derive whole sections (all fields picked) so the email reads nicely; the
    // rest go as individual fields.
    const sectionKeys = wholeForm ? [] : outline.filter(isSectionFull).map((s) => s.key);
    const covered = new Set(
      outline.filter((s) => sectionKeys.includes(s.key)).flatMap((s) => s.fields.map((f) => f.field_key))
    );
    const fieldKeys = wholeForm ? [] : [...selected].filter((k) => !covered.has(k));

    setSubmitting(true);
    try {
      await api.post(ENDPOINTS.admin.databankRequestEdit, {
        databankId,
        wholeForm,
        sectionKeys,
        fieldKeys,
        note: note.trim() || undefined,
        dueAt: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : undefined,
      });
      setDone(true);
      router.refresh();
    } catch (e) {
      setError(apiErrorMessage(e, "Couldn't send the request"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-pasha-red/30 bg-pasha-red/[0.06] px-4 py-2 text-sm font-medium text-pasha-red hover:bg-pasha-red/10 transition-colors"
      >
        <Send className="w-4 h-4" />
        Request info
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
          onClick={close}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-pasha-line px-6 py-4">
              <div>
                <h2 className="font-medium text-pasha-ink">Request info from {startupName || "this startup"}</h2>
                <p className="mt-0.5 text-sm text-pasha-muted">
                  Unlock the fields below so the startup can edit them, then we email them a link.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="rounded-lg p-1.5 text-pasha-muted hover:bg-pasha-stone/60 hover:text-pasha-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {done ? (
              <div className="px-6 py-10 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
                <p className="mt-3 font-medium text-pasha-ink">Request sent</p>
                <p className="mt-1 text-sm text-pasha-muted">
                  {startupName || "The startup"} has been emailed a link to update the requested fields.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-6 rounded-full bg-pasha-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-pasha-red transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Body */}
                <div className="max-h-[55vh] overflow-y-auto px-6 py-4">
                  {/* Whole form */}
                  <label className="flex items-center gap-2.5 rounded-lg border border-pasha-line px-3 py-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wholeForm}
                      onChange={(e) => setWholeForm(e.target.checked)}
                      className="h-4 w-4 accent-pasha-red"
                    />
                    <span className="text-sm font-medium text-pasha-ink">Unlock the entire form</span>
                  </label>

                  <div className={wholeForm ? "pointer-events-none mt-4 space-y-4 opacity-40" : "mt-4 space-y-4"}>
                    {outline.map((section) => (
                      <div key={section.key} className="rounded-lg border border-pasha-line">
                        <label className="flex items-center gap-2.5 border-b border-pasha-line/70 bg-pasha-stone/30 px-3 py-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSectionFull(section)}
                            onChange={() => toggleSection(section)}
                            className="h-4 w-4 accent-pasha-red"
                          />
                          <span className="text-sm font-medium text-pasha-ink">{section.title}</span>
                          <span className="ml-auto font-mono text-[10px] uppercase tracking-wide text-pasha-muted">
                            Step {section.step + 1}
                          </span>
                        </label>
                        <div className="grid gap-x-4 gap-y-1.5 px-3 py-2.5 sm:grid-cols-2">
                          {section.fields.map((f) => (
                            <label key={f.field_key} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selected.has(f.field_key)}
                                onChange={() => toggleField(f.field_key)}
                                className="h-3.5 w-3.5 accent-pasha-red"
                              />
                              <span className="text-sm text-pasha-ink/90 truncate">{f.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Note + due date */}
                  <div className="mt-5 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-pasha-ink">Message to the startup (optional)</label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        placeholder="e.g. Please confirm your current team size and add your latest pitch deck."
                        className="mt-1 w-full rounded-lg border border-pasha-line px-3 py-2 text-sm text-pasha-ink focus:border-pasha-red focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-pasha-ink">Respond by (optional)</label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="mt-1 rounded-lg border border-pasha-line px-3 py-2 text-sm text-pasha-ink focus:border-pasha-red focus:outline-none"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="mt-4 rounded-lg border border-pasha-red/30 bg-pasha-red/[0.04] px-3 py-2 text-sm text-pasha-red">
                      {error}
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 border-t border-pasha-line px-6 py-4">
                  <span className="text-sm text-pasha-muted">
                    {wholeForm ? "Entire form" : `${selectedCount} field${selectedCount === 1 ? "" : "s"} selected`}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={close}
                      className="rounded-full border border-pasha-line bg-white px-4 py-2 text-sm font-medium text-pasha-ink hover:bg-pasha-stone/60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={submit}
                      disabled={submitting || (!wholeForm && selectedCount === 0)}
                      className="inline-flex items-center gap-2 rounded-full bg-pasha-red px-5 py-2 text-sm font-medium text-white hover:bg-pasha-red-dark transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send request
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
