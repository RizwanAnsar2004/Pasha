"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Check, Copy, Eye, Loader2, Lock, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// CKEditor touches `window` at import time → load client-only.
const RichTextEditor = dynamic(() => import("./RichTextEditor"), {
  ssr: false,
  loading: () => <div className="text-sm text-pasha-muted px-1 py-3">Loading editor…</div>,
});
import {
  EMAIL_PLACEHOLDERS,
  EMAIL_TEMPLATE_STATUSES,
  placeholderDefaults,
  renderTemplate,
  statusLabel,
  type EmailTemplateRow,
  type EmailTemplateStatus,
} from "@/lib/email-templates";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";
import { Pagination } from "../_components/Pagination";
import { useListNav } from "../_components/useListNav";
import { ShimmerOverlay } from "../_components/ShimmerOverlay";

const inputCls =
  "w-full rounded-lg border border-pasha-line bg-white px-3 py-2.5 text-sm text-pasha-ink placeholder:text-pasha-muted/70 focus:outline-none focus:border-pasha-red focus:ring-2 focus:ring-pasha-red/10";
const textareaCls = `${inputCls} min-h-[100px] resize-y`;

type FormState = {
  template_id: string;
  name: string;
  subject: string;
  body: string;
  status: EmailTemplateStatus;
  is_default: boolean;
  description: string;
};

const EMPTY_FORM: FormState = {
  template_id: "",
  name: "",
  subject: "",
  body: "",
  status: "draft",
  is_default: false,
  description: "",
};

function rowToForm(row: EmailTemplateRow): FormState {
  return {
    template_id: row.template_id,
    name: row.name,
    subject: row.subject,
    body: row.body,
    status: row.status,
    is_default: row.is_default,
    description: row.description,
  };
}

function formToPayload(form: FormState) {
  return {
    template_id: form.template_id.trim(),
    name: form.name,
    subject: form.subject,
    body: form.body,
    status: form.status,
    is_default: form.is_default,
    description: form.description,
    // Placeholders come from the fixed catalog (sample values for previews).
    placeholders: placeholderDefaults(),
  };
}

async function api(method: string, body?: unknown) {
  const res = await fetch("/api/admin/email-templates", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

export function EmailTemplatesClient({
  initial,
  total,
  page,
  pageSize,
}: {
  initial: EmailTemplateRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const { isPending, setParams } = useListNav();
  const [rows, setRows] = useState<EmailTemplateRow[]>(initial);
  useEffect(() => { setRows(initial); }, [initial]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [savingAs, setSavingAs] = useState<EmailTemplateStatus | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplateRow | null>(null);

  const copyToken = (token: string) => {
    navigator.clipboard?.writeText(token).catch(() => {});
    setCopied(token);
    setTimeout(() => setCopied((c) => (c === token ? null : c)), 1200);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setPreview(false);
    setMsg(null);
  };

  const openEdit = (row: EmailTemplateRow) => {
    setEditingId(row.id);
    setForm(rowToForm(row));
    setShowForm(true);
    setPreview(false);
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

  const save = (status: EmailTemplateStatus) => {
    setSavingAs(status);
    return run(
      async () => {
        const payload = formToPayload({ ...form, status });
        if (editingId) {
          const { template } = await api("PATCH", { id: editingId, ...payload });
          setRows((prev) => prev.map((r) => (r.id === editingId ? template : r)));
          closeForm();
        } else {
          const { template } = await api("POST", payload);
          setRows((prev) => [template, ...prev]);
          closeForm();
        }
      },
      status === "active" ? "Template activated" : status === "archived" ? "Template archived" : "Saved as draft"
    );
  };

  const confirmDelete = () =>
    run(async () => {
      if (!deleteTarget) return;
      await api("DELETE", { id: deleteTarget.id });
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
      if (editingId === deleteTarget.id) closeForm();
    });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Live preview: substitute the catalog's sample values into subject + body.
  const previewValues = useMemo(() => placeholderDefaults(), []);
  const previewSubject = useMemo(
    () => renderTemplate(form.subject, previewValues),
    [form.subject, previewValues]
  );
  const previewBody = useMemo(
    () => renderTemplate(form.body, previewValues),
    [form.body, previewValues]
  );

  const canSave = form.template_id.trim().length > 0 && /^[a-z0-9_]+$/.test(form.template_id.trim());

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={closeForm}
            className="inline-flex items-center gap-2 text-sm text-pasha-muted hover:text-pasha-ink"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to templates
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-pasha-line px-3 py-2 text-xs font-medium text-pasha-ink hover:bg-pasha-stone/60"
            >
              <Eye className="w-3.5 h-3.5" />
              {preview ? "Editor" : "Preview"}
            </button>
            <button
              type="button"
              onClick={() => save("draft")}
              disabled={busy || !canSave}
              className="inline-flex items-center gap-2 rounded-full border border-pasha-line bg-white px-5 py-2 text-sm font-medium text-pasha-ink hover:bg-pasha-stone/60 disabled:opacity-50"
            >
              {busy && savingAs === "draft" && <Loader2 className="w-4 h-4 animate-spin" />}
              Save as draft
            </button>
            <button
              type="button"
              onClick={() => save("active")}
              disabled={busy || !canSave}
              className="inline-flex items-center gap-2 rounded-full bg-pasha-red px-5 py-2 text-sm font-medium text-white hover:bg-pasha-red-dark disabled:opacity-50"
            >
              {busy && savingAs === "active" && <Loader2 className="w-4 h-4 animate-spin" />}
              Save &amp; activate
            </button>
          </div>
        </div>

        <div>
          <h1 className="font-serif text-2xl text-pasha-ink">
            {editingId ? "Edit template" : "New template"}
          </h1>
          <p className="mt-1 text-sm text-pasha-muted">
            HTML email template with {"{{placeholder}}"} tokens. Define each token&apos;s sample value below.
          </p>
        </div>

        {msg && (
          <p className={cn("text-sm", msg.includes("wrong") || msg.includes("fail") || msg.includes("exist") ? "text-pasha-red" : "text-tier-featured")}>
            {msg}
          </p>
        )}

        {preview ? (
          <div className="rounded-2xl border border-pasha-line bg-white p-5 shadow-sm space-y-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-[1px] text-pasha-muted">Subject</p>
              <p className="mt-1 text-sm font-medium text-pasha-ink">{previewSubject || "(no subject)"}</p>
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-[1px] text-pasha-muted mb-2">Body</p>
              <iframe
                title="Email preview"
                className="w-full min-h-[420px] rounded-lg border border-pasha-line bg-white"
                srcDoc={previewBody}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Identity">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Template ID *">
                  <input
                    className={cn(inputCls, "font-mono")}
                    value={form.template_id}
                    onChange={(e) => set("template_id", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                    placeholder="welcome_email"
                  />
                </Field>
                <Field label="Status">
                  <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value as EmailTemplateStatus)}>
                    {EMAIL_TEMPLATE_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Name">
                <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Welcome email" />
              </Field>
              <Field label="Description">
                <textarea className={textareaCls} value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="When this template is used…" />
              </Field>
              <label className="flex items-start gap-2.5 text-sm text-pasha-ink cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-pasha-line text-pasha-red focus:ring-pasha-red/20"
                  checked={form.is_default}
                  onChange={(e) => set("is_default", e.target.checked)}
                />
                <span>
                  Default template
                  <span className="block text-xs text-pasha-muted">Protected — cannot be deleted while this is on.</span>
                </span>
              </label>
            </Section>

            <Section title="Available placeholders">
              <p className="text-xs text-pasha-muted">
                These are the only supported tokens — click one to copy, then paste it into the subject or body.
                They&apos;re filled with each recipient&apos;s real data when the email is sent.
              </p>
              <div className="flex flex-wrap gap-2">
                {EMAIL_PLACEHOLDERS.map((p) => (
                  <button
                    key={p.token}
                    type="button"
                    onClick={() => copyToken(p.token)}
                    title={`Copy ${p.token}`}
                    className="group inline-flex items-center gap-1.5 rounded-lg border border-pasha-line bg-white px-2.5 py-1.5 text-xs text-pasha-ink hover:border-pasha-red hover:bg-pasha-red/5"
                  >
                    <span className="font-mono text-pasha-red">{p.token}</span>
                    <span className="text-pasha-muted">{p.label}</span>
                    {copied === p.token ? (
                      <Check className="w-3.5 h-3.5 text-tier-featured" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-pasha-muted/60 group-hover:text-pasha-red" />
                    )}
                  </button>
                ))}
              </div>
            </Section>

            <div className="lg:col-span-2">
              <Section title="Content">
                <Field label="Subject">
                  <input className={inputCls} value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Welcome to P@SHA, {{first_name}}!" />
                </Field>
                <Field label="Body">
                  <RichTextEditor
                    key={editingId ?? "new"}
                    value={form.body}
                    onChange={(html) => set("body", html)}
                  />
                  <p className="mt-1 text-xs text-pasha-muted">
                    Use the <strong>Source</strong> button (top-left) to paste/edit raw HTML. Insert placeholders like <code className="font-mono">{"{{first_name}}"}</code> directly in the text.
                  </p>
                </Field>
              </Section>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-pasha-ink">Email Templates</h1>
          <p className="mt-1 text-sm text-pasha-muted">
            Create and manage reusable HTML email templates.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-full bg-pasha-red px-5 py-2 text-sm font-medium text-white hover:bg-pasha-red-dark">
          <Plus className="w-4 h-4" />
          New template
        </button>
      </div>

      {msg && <p className="text-sm text-tier-featured">{msg}</p>}

      <div className="rounded-2xl border border-pasha-line bg-white overflow-hidden shadow-sm relative">
        <ShimmerOverlay active={isPending} />
        {rows.length === 0 ? (
          <p className="px-6 py-12 text-sm text-pasha-muted text-center">No templates yet. Create your first template.</p>
        ) : (
          <div className="divide-y divide-pasha-line">
            {rows.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-pasha-stone/30">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-medium text-pasha-ink flex items-center gap-2">
                    <Mail className="w-4 h-4 text-pasha-muted" />
                    {row.name || row.template_id}
                  </p>
                  <p className="mt-0.5 text-xs text-pasha-muted flex flex-wrap items-center gap-2">
                    <span className="font-mono">{row.template_id}</span>
                    {row.subject && <span className="truncate max-w-[320px]">· {row.subject}</span>}
                    <span>· {format(parseISO(row.created_at), "MMM d, yyyy")}</span>
                  </p>
                </div>
                {row.is_default && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-pasha-red/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[1px] text-pasha-red">
                    <Lock className="w-3 h-3" />
                    Default
                  </span>
                )}
                <span className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-mono uppercase tracking-[1px]",
                  row.status === "active"
                    ? "bg-tier-featured/10 text-tier-featured"
                    : row.status === "archived"
                      ? "bg-pasha-stone text-pasha-muted"
                      : "bg-pasha-stone/60 text-pasha-ink/70"
                )}>
                  {statusLabel(row.status)}
                </span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => openEdit(row)} className="text-pasha-muted hover:text-pasha-ink" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  {row.is_default ? (
                    <span className="text-pasha-line cursor-not-allowed" title="Default templates cannot be deleted">
                      <Trash2 className="w-4 h-4" />
                    </span>
                  ) : (
                    <button type="button" onClick={() => setDeleteTarget(row)} className="text-pasha-muted hover:text-pasha-red" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
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
        open={!!deleteTarget}
        title="Delete template"
        description={`Remove "${deleteTarget?.name || deleteTarget?.template_id}"? This cannot be undone.`}
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-pasha-line bg-white p-5 shadow-sm space-y-4">
      <h2 className="text-sm font-semibold text-pasha-ink">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm text-pasha-ink">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
