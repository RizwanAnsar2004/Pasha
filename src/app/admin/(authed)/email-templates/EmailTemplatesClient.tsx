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
import { PageHeader, EmptyState, Pill, type PillTone } from "../_components/EmailUI";

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
      <PageHeader
        icon={Mail}
        title="Email Templates"
        subtitle={`${total} template${total === 1 ? "" : "s"} · reusable HTML emails`}
        action={
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-full bg-pasha-red px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-pasha-red/25 hover:bg-pasha-red-dark">
            <Plus className="w-4 h-4" />
            New template
          </button>
        }
      />

      {msg && <p className="text-sm text-tier-featured">{msg}</p>}

      <div className="relative">
        <ShimmerOverlay active={isPending} />
        {rows.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No templates yet"
            hint="Create your first reusable email template to get started."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className="group flex flex-col rounded-2xl border border-pasha-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-pasha-red/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pasha-red/10 text-pasha-red">
                      <Mail className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-pasha-ink leading-tight">{row.name || row.template_id}</p>
                      <p className="truncate font-mono text-[11px] text-pasha-muted">{row.template_id}</p>
                    </div>
                  </div>
                  <StatusPill status={row.status} />
                </div>

                <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm text-pasha-ink/75">
                  {row.subject || <span className="text-pasha-muted/70">No subject</span>}
                </p>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-pasha-line pt-3">
                  <span className="flex items-center gap-2 text-xs text-pasha-muted">
                    {format(parseISO(row.created_at), "MMM d, yyyy")}
                    {row.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-pasha-red/10 px-1.5 py-0.5 text-[10px] font-medium text-pasha-red">
                        <Lock className="h-3 w-3" />
                        Default
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => openEdit(row)} className="rounded-lg p-1.5 text-pasha-muted hover:bg-pasha-stone/60 hover:text-pasha-ink" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    {row.is_default ? (
                      <span className="rounded-lg p-1.5 text-pasha-line cursor-not-allowed" title="Default templates cannot be deleted">
                        <Trash2 className="h-4 w-4" />
                      </span>
                    ) : (
                      <button type="button" onClick={() => setDeleteTarget(row)} className="rounded-lg p-1.5 text-pasha-muted hover:bg-pasha-red/5 hover:text-pasha-red" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <Pagination
            total={total}
            page={page}
            pageSize={pageSize}
            setParams={setParams}
            isPending={isPending}
          />
        </div>
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

function StatusPill({ status }: { status: EmailTemplateStatus }) {
  const tone: PillTone = status === "active" ? "green" : status === "archived" ? "slate" : "amber";
  return <Pill label={statusLabel(status)} tone={tone} />;
}
