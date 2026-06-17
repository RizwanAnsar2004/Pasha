"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Download,
  ExternalLink,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { eventSlug } from "@/lib/slug";
import {
  AGENDA_TAGS,
  EVENT_FORMATS,
  EVENT_TYPES,
  eventTypeLabel,
  type AgendaItem,
  type AudienceItem,
  type EntryType,
  type EventFormat,
  type EventRow,
  type EventStatus,
  type EventType,
  type RegistrationStatus,
  type Speaker,
} from "@/lib/events";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";

export type EventListRow = EventRow;

const inputCls =
  "w-full rounded-lg border border-pasha-line bg-white px-3 py-2.5 text-sm text-pasha-ink placeholder:text-pasha-muted/70 focus:outline-none focus:border-pasha-red focus:ring-2 focus:ring-pasha-red/10";

const textareaCls = `${inputCls} min-h-[100px] resize-y`;

type FormState = {
  title: string;
  summary: string;
  about: string;
  event_type: EventType;
  status: EventStatus;
  registration_status: RegistrationStatus;
  event_date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  venue: string;
  location: string;
  format: EventFormat;
  organizer: string;
  expected_attendees: string;
  capacity: string;
  capacity_note: string;
  entry_type: EntryType;
  registration_url: string;
  audience_items: AudienceItem[];
  agenda_items: AgendaItem[];
  speakers: Speaker[];
  partners: string[];
};

function defaultDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

const EMPTY_FORM: FormState = {
  title: "",
  summary: "",
  about: "",
  event_type: "seminar",
  status: "draft",
  registration_status: "open",
  event_date: defaultDate(),
  start_time: "09:00",
  end_time: "17:00",
  timezone: "PKT",
  venue: "",
  location: "",
  format: "in_person",
  organizer: "P@SHA Committee",
  expected_attendees: "",
  capacity: "",
  capacity_note: "",
  entry_type: "free",
  registration_url: "",
  audience_items: [],
  agenda_items: [],
  speakers: [],
  partners: [],
};

function rowToForm(row: EventListRow): FormState {
  return {
    title: row.title,
    summary: row.summary,
    about: row.about,
    event_type: row.event_type,
    status: row.status,
    registration_status: row.registration_status,
    event_date: row.event_date,
    start_time: row.start_time,
    end_time: row.end_time,
    timezone: row.timezone,
    venue: row.venue,
    location: row.location,
    format: row.format,
    organizer: row.organizer,
    expected_attendees: row.expected_attendees,
    capacity: row.capacity != null ? String(row.capacity) : "",
    capacity_note: row.capacity_note,
    entry_type: row.entry_type,
    registration_url: row.registration_url ?? "",
    audience_items: row.audience_items ?? [],
    agenda_items: row.agenda_items ?? [],
    speakers: row.speakers ?? [],
    partners: row.partners ?? [],
  };
}

function formToPayload(form: FormState) {
  const capacity = form.capacity.trim() ? parseInt(form.capacity, 10) : null;
  return {
    ...form,
    capacity: Number.isFinite(capacity) ? capacity : null,
    registration_url: form.registration_url.trim() || null,
  };
}

async function api(method: string, body?: unknown) {
  const res = await fetch("/api/admin/events", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

export function EventsClient({ initial }: { initial: EventListRow[] }) {
  const [rows, setRows] = useState<EventListRow[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [savingAs, setSavingAs] = useState<EventStatus | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventListRow | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setMsg(null);
  };

  const openEdit = (row: EventListRow) => {
    setEditingId(row.id);
    setForm(rowToForm(row));
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

  // Two explicit actions — "Save as draft" and "Publish" — each set the status
  // on save, so admins control visibility with a clear button rather than a
  // dropdown.
  const save = (status: EventStatus) => {
    setSavingAs(status);
    return run(
      async () => {
        const payload = formToPayload({ ...form, status });
        if (editingId) {
          const { event } = await api("PATCH", { id: editingId, ...payload });
          setRows((prev) => prev.map((r) => (r.id === editingId ? event : r)));
          closeForm();
        } else {
          const { event } = await api("POST", payload);
          setRows((prev) => [event, ...prev]);
          closeForm();
        }
      },
      status === "published" ? "Event published" : "Saved as draft"
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

  const exportCSV = () => {
    const lines = [
      "title,type,date,status,location",
      ...rows.map((r) =>
        [r.title, r.event_type, r.event_date, r.status, r.location]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `events-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

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
            Back to events
          </button>
          <div className="flex items-center gap-2">
            {editingId && rows.find((r) => r.id === editingId)?.status === "published" && (
              <Link
                href={`/events/${eventSlug(form.title, editingId)}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg border border-pasha-line px-3 py-2 text-xs font-medium text-pasha-ink hover:bg-pasha-stone/60"
              >
                Preview
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
            <button
              type="button"
              onClick={() => save("draft")}
              disabled={busy || !form.title.trim() || !form.event_date}
              className="inline-flex items-center gap-2 rounded-full border border-pasha-line bg-white px-5 py-2 text-sm font-medium text-pasha-ink hover:bg-pasha-stone/60 disabled:opacity-50"
            >
              {busy && savingAs === "draft" && <Loader2 className="w-4 h-4 animate-spin" />}
              Save as draft
            </button>
            <button
              type="button"
              onClick={() => save("published")}
              disabled={busy || !form.title.trim() || !form.event_date}
              className="inline-flex items-center gap-2 rounded-full bg-pasha-red px-5 py-2 text-sm font-medium text-white hover:bg-pasha-red-dark disabled:opacity-50"
            >
              {busy && savingAs === "published" && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId && rows.find((r) => r.id === editingId)?.status === "published"
                ? "Update & keep published"
                : "Publish"}
            </button>
          </div>
        </div>

        <div>
          <h1 className="font-serif text-2xl text-pasha-ink">
            {editingId ? "Edit event" : "Create event"}
          </h1>
          <p className="mt-1 text-sm text-pasha-muted">
            Enter all details shown on the public event page.
          </p>
        </div>

        {msg && (
          <p className={cn("text-sm", msg.includes("wrong") || msg.includes("fail") ? "text-pasha-red" : "text-tier-featured")}>
            {msg}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Basic info">
            <Field label="Title *">
              <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <Field label="Short summary (hero)">
              <textarea className={textareaCls} value={form.summary} onChange={(e) => set("summary", e.target.value)} rows={3} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Type *">
                <select className={inputCls} value={form.event_type} onChange={(e) => set("event_type", e.target.value as EventType)}>
                  {EVENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Format">
                <select className={inputCls} value={form.format} onChange={(e) => set("format", e.target.value as EventFormat)}>
                  {EVENT_FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Status">
                <div className={`${inputCls} flex items-center`}>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                      form.status === "published"
                        ? "bg-tier-featured/10 text-tier-featured"
                        : "bg-pasha-stone text-pasha-muted"
                    }`}
                  >
                    {form.status === "published" ? "Published" : "Draft"}
                  </span>
                  <span className="ml-2 text-xs text-pasha-muted">— use the buttons above to change</span>
                </div>
              </Field>
              <Field label="Organizer">
                <input className={inputCls} value={form.organizer} onChange={(e) => set("organizer", e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title="Schedule & location">
            <Field label="Event date *">
              <input type="date" className={inputCls} value={form.event_date} onChange={(e) => set("event_date", e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Start time">
                <input type="time" className={inputCls} value={form.start_time} onChange={(e) => set("start_time", e.target.value)} />
              </Field>
              <Field label="End time">
                <input type="time" className={inputCls} value={form.end_time} onChange={(e) => set("end_time", e.target.value)} />
              </Field>
              <Field label="Timezone">
                <input className={inputCls} value={form.timezone} onChange={(e) => set("timezone", e.target.value)} />
              </Field>
            </div>
            <Field label="Venue">
              <input className={inputCls} value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder="Karachi Expo Centre" />
            </Field>
            <Field label="Location (display)">
              <input className={inputCls} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Karachi Expo Centre, Karachi" />
            </Field>
            <Field label="Expected attendees">
              <input className={inputCls} value={form.expected_attendees} onChange={(e) => set("expected_attendees", e.target.value)} placeholder="2,000+" />
            </Field>
          </Section>
        </div>

        <Section title="Registration (display only for now)">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Registration status">
              <select className={inputCls} value={form.registration_status} onChange={(e) => set("registration_status", e.target.value as RegistrationStatus)}>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </Field>
            <Field label="Entry type">
              <select className={inputCls} value={form.entry_type} onChange={(e) => set("entry_type", e.target.value as EntryType)}>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </Field>
            <Field label="Capacity">
              <input
                type="text"
                inputMode="numeric"
                className={inputCls}
                value={form.capacity}
                onChange={(e) => set("capacity", e.target.value.replace(/\D/g, ""))}
                placeholder="2000"
              />
            </Field>
            <Field label="Capacity note">
              <input className={inputCls} value={form.capacity_note} onChange={(e) => set("capacity_note", e.target.value)} placeholder="Seats filling fast" />
            </Field>
          </div>
          <Field label="Registration URL (for later)">
            <input className={inputCls} value={form.registration_url} onChange={(e) => set("registration_url", e.target.value)} placeholder="https://..." />
          </Field>
        </Section>

        <Section title="About this event">
          <textarea className={textareaCls} value={form.about} onChange={(e) => set("about", e.target.value)} rows={8} placeholder="Full event description…" />
        </Section>

        <DynamicSection
          title="Who should attend"
          onAdd={() => set("audience_items", [...form.audience_items, { title: "", subtitle: "" }])}
        >
          {form.audience_items.map((item, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 grid gap-2 sm:grid-cols-2">
                <input className={inputCls} placeholder="Title" value={item.title} onChange={(e) => {
                  const next = [...form.audience_items];
                  next[i] = { ...item, title: e.target.value };
                  set("audience_items", next);
                }} />
                <input className={inputCls} placeholder="Subtitle" value={item.subtitle} onChange={(e) => {
                  const next = [...form.audience_items];
                  next[i] = { ...item, subtitle: e.target.value };
                  set("audience_items", next);
                }} />
              </div>
              <RemoveBtn onClick={() => set("audience_items", form.audience_items.filter((_, j) => j !== i))} />
            </div>
          ))}
        </DynamicSection>

        <DynamicSection
          title="Agenda"
          onAdd={() => set("agenda_items", [...form.agenda_items, { time: "09:00", title: "", tag: "other" }])}
        >
          {form.agenda_items.map((item, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input className={cn(inputCls, "w-28 shrink-0")} placeholder="08:30" value={item.time} onChange={(e) => {
                const next = [...form.agenda_items];
                next[i] = { ...item, time: e.target.value };
                set("agenda_items", next);
              }} />
              <input className={cn(inputCls, "flex-1")} placeholder="Session title" value={item.title} onChange={(e) => {
                const next = [...form.agenda_items];
                next[i] = { ...item, title: e.target.value };
                set("agenda_items", next);
              }} />
              <select className={cn(inputCls, "w-32 shrink-0")} value={item.tag} onChange={(e) => {
                const next = [...form.agenda_items];
                next[i] = { ...item, tag: e.target.value as AgendaItem["tag"] };
                set("agenda_items", next);
              }}>
                {AGENDA_TAGS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <RemoveBtn onClick={() => set("agenda_items", form.agenda_items.filter((_, j) => j !== i))} />
            </div>
          ))}
        </DynamicSection>

        <DynamicSection
          title="Featured speakers"
          onAdd={() => set("speakers", [...form.speakers, { name: "", role: "", topic: "" }])}
        >
          {form.speakers.map((sp, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] items-start">
              <input className={inputCls} placeholder="Name" value={sp.name} onChange={(e) => {
                const next = [...form.speakers];
                next[i] = { ...sp, name: e.target.value };
                set("speakers", next);
              }} />
              <input className={inputCls} placeholder="Role / organization" value={sp.role} onChange={(e) => {
                const next = [...form.speakers];
                next[i] = { ...sp, role: e.target.value };
                set("speakers", next);
              }} />
              <input className={inputCls} placeholder="Talk topic" value={sp.topic} onChange={(e) => {
                const next = [...form.speakers];
                next[i] = { ...sp, topic: e.target.value };
                set("speakers", next);
              }} />
              <RemoveBtn onClick={() => set("speakers", form.speakers.filter((_, j) => j !== i))} />
            </div>
          ))}
        </DynamicSection>

        <DynamicSection
          title="Event partners"
          onAdd={() => set("partners", [...form.partners, ""])}
        >
          <div className="flex flex-wrap gap-2">
            {form.partners.map((p, i) => (
              <div key={i} className="flex items-center gap-1">
                <input className={cn(inputCls, "w-40")} placeholder="Partner name" value={p} onChange={(e) => {
                  const next = [...form.partners];
                  next[i] = e.target.value;
                  set("partners", next);
                }} />
                <RemoveBtn onClick={() => set("partners", form.partners.filter((_, j) => j !== i))} />
              </div>
            ))}
          </div>
        </DynamicSection>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-pasha-ink">Events</h1>
          <p className="mt-1 text-sm text-pasha-muted">
            Create and manage webinars and seminars for the public events page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={exportCSV} className="inline-flex items-center gap-1.5 rounded-lg border border-pasha-line px-3 py-2 text-xs font-medium text-pasha-ink hover:bg-pasha-stone/60">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-full bg-pasha-red px-5 py-2 text-sm font-medium text-white hover:bg-pasha-red-dark">
            <Plus className="w-4 h-4" />
            New event
          </button>
        </div>
      </div>

      {msg && <p className="text-sm text-tier-featured">{msg}</p>}

      <div className="rounded-2xl border border-pasha-line bg-white overflow-hidden shadow-sm">
        {rows.length === 0 ? (
          <p className="px-6 py-12 text-sm text-pasha-muted text-center">No events yet. Create your first event.</p>
        ) : (
          <div className="divide-y divide-pasha-line">
            {rows.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-pasha-stone/30">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-medium text-pasha-ink">{row.title}</p>
                  <p className="mt-0.5 text-xs text-pasha-muted flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(parseISO(row.event_date), "MMM d, yyyy")}
                    </span>
                    {row.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {row.location}
                      </span>
                    )}
                  </p>
                </div>
                <span className="rounded-md bg-pasha-stone/80 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[1px] text-pasha-ink/70">
                  {eventTypeLabel(row.event_type)}
                </span>
                <span className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-mono uppercase tracking-[1px]",
                  row.status === "published" ? "bg-tier-featured/10 text-tier-featured" : "bg-pasha-stone text-pasha-muted"
                )}>
                  {row.status}
                </span>
                <div className="flex items-center gap-2">
                  {row.status === "published" && (
                    <Link href={`/events/${eventSlug(row.title, row.id)}`} target="_blank" className="text-pasha-muted hover:text-pasha-ink" title="View public page">
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}
                  <button type="button" onClick={() => openEdit(row)} className="text-pasha-muted hover:text-pasha-ink" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(row)} className="text-pasha-muted hover:text-pasha-red" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title="Delete event"
        description={`Remove "${deleteTarget?.title}"? This cannot be undone.`}
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

function DynamicSection({
  title,
  children,
  onAdd,
}: {
  title: string;
  children: React.ReactNode;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-2xl border border-pasha-line bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-pasha-ink">{title}</h2>
        <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 text-xs font-medium text-pasha-red hover:underline">
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>
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

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 rounded p-2 text-pasha-muted hover:text-pasha-red hover:bg-pasha-red/5">
      <X className="w-4 h-4" />
    </button>
  );
}
