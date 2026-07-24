"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api as http } from "@/lib/api/client";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  AlertCircle,
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
import { eventSlug } from "@/lib/utils/slug";
import {
  AGENDA_TAGS,
  EVENT_FORMATS,
  EVENT_TYPES,
  TIMEZONES,
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
} from "@/lib/events/events";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { Pagination } from "../_components/Pagination";
import { useListNav } from "../_components/useListNav";
import { ShimmerOverlay } from "../_components/ShimmerOverlay";
import { toCsv, downloadCsv, fetchAllForExport } from "@/lib/utils/csv";

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
  organizer: "PASHA Committee",
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
    agenda_items: sortAgenda(form.agenda_items),
    capacity: Number.isFinite(capacity) ? capacity : null,
    registration_url: form.registration_url.trim() || null,
  };
}

// "HH:MM" sorts correctly as a plain string; rows with a blank/unparseable time
// sink to the bottom rather than silently jumping to the top of the day.
function timeRank(t: string): string {
  return /^\d{2}:\d{2}/.test(t) ? t : "99:99";
}

function sortAgenda(items: AgendaItem[]): AgendaItem[] {
  return [...items].sort((a, b) => timeRank(a.time).localeCompare(timeRank(b.time)));
}

// True when the rows aren't already in chronological order.
function agendaOutOfOrder(items: AgendaItem[]): boolean {
  for (let i = 1; i < items.length; i++) {
    if (timeRank(items[i - 1].time) > timeRank(items[i].time)) return true;
  }
  return false;
}

// 24h "HH:MM" -> "9:00 AM", for the read-back hint under each row.
function to12h(t: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return "";
  const h = Number(m[1]);
  if (!Number.isFinite(h) || h > 23) return "";
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${suffix}`;
}

// Default time for a newly added row: 30 minutes after the latest existing row.
function nextAgendaTime(items: AgendaItem[]): string {
  const last = sortAgenda(items).filter((i) => /^\d{2}:\d{2}/.test(i.time)).pop();
  if (!last) return "09:00";
  const [h, m] = last.time.split(":").map(Number);
  const total = Math.min(h * 60 + m + 30, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// Field-keyed validation errors. Array entries use the API's dotted path
// ("agenda_items.2.title") so server-side issues can be pinned to the same
// input the client-side check would have flagged.
type FieldErrors = Record<string, string>;

// Mirrors the zod schema in /api/admin/events so the admin sees the problem
// against the offending input instead of a bare "Invalid input" at the top.
function validateForm(form: FormState): FieldErrors {
  const e: FieldErrors = {};
  const max = (v: string, n: number, key: string, label: string) => {
    if (v.trim().length > n) e[key] = `${label} must be ${n} characters or fewer.`;
  };

  if (!form.title.trim()) e.title = "Title is required.";
  else max(form.title, 200, "title", "Title");

  max(form.summary, 500, "summary", "Summary");
  max(form.about, 10000, "about", "About");
  max(form.venue, 200, "venue", "Venue");
  max(form.location, 300, "location", "Location");
  max(form.organizer, 200, "organizer", "Organizer");
  max(form.expected_attendees, 100, "expected_attendees", "Expected attendees");
  max(form.capacity_note, 200, "capacity_note", "Capacity note");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.event_date)) {
    e.event_date = "Pick a valid event date.";
  }

  if (!form.start_time.trim()) e.start_time = "Start time is required.";
  if (!form.end_time.trim()) e.end_time = "End time is required.";
  if (!e.start_time && !e.end_time && form.end_time <= form.start_time) {
    e.end_time = "End time must be after the start time.";
  }

  if (!form.timezone.trim()) e.timezone = "Timezone is required.";
  else max(form.timezone, 20, "timezone", "Timezone");

  if (form.capacity.trim()) {
    const n = Number(form.capacity);
    if (!Number.isInteger(n) || n <= 0) e.capacity = "Capacity must be a whole number above 0.";
  }

  if (form.registration_url.trim()) {
    try {
      new URL(form.registration_url.trim());
    } catch {
      e.registration_url = "Enter a full URL, including https://";
    }
  }

  if (form.audience_items.length > 12) e.audience_items = "At most 12 audience items.";
  form.audience_items.forEach((it, i) => {
    if (!it.title.trim()) e[`audience_items.${i}.title`] = "Title is required.";
    else max(it.title, 120, `audience_items.${i}.title`, "Title");
    max(it.subtitle, 200, `audience_items.${i}.subtitle`, "Subtitle");
  });

  if (form.agenda_items.length > 50) e.agenda_items = "At most 50 agenda rows.";
  form.agenda_items.forEach((it, i) => {
    if (!it.time.trim()) e[`agenda_items.${i}.time`] = "Time is required.";
    if (!it.title.trim()) e[`agenda_items.${i}.title`] = "Session title is required.";
    else max(it.title, 300, `agenda_items.${i}.title`, "Session title");
    if (it.tag === "other" && (it.tag_other ?? "").trim().length > 40) {
      e[`agenda_items.${i}.tag_other`] = "40 characters or fewer.";
    }
  });

  if (form.speakers.length > 24) e.speakers = "At most 24 speakers.";
  form.speakers.forEach((sp, i) => {
    if (!sp.name.trim()) e[`speakers.${i}.name`] = "Name is required.";
    else max(sp.name, 120, `speakers.${i}.name`, "Name");
    max(sp.role, 200, `speakers.${i}.role`, "Role");
    max(sp.topic, 300, `speakers.${i}.topic`, "Topic");
  });

  if (form.partners.length > 30) e.partners = "At most 30 partners.";
  form.partners.forEach((p, i) => {
    if (!p.trim()) e[`partners.${i}`] = "Partner name is required.";
    else max(p, 120, `partners.${i}`, "Partner name");
  });

  return e;
}

// Human-readable section name for a field key, used in the summary banner.
const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  summary: "Short summary",
  about: "About this event",
  event_date: "Event date",
  start_time: "Start time",
  end_time: "End time",
  timezone: "Timezone",
  venue: "Venue",
  location: "Location",
  organizer: "Organizer",
  expected_attendees: "Expected attendees",
  capacity: "Capacity",
  capacity_note: "Capacity note",
  registration_url: "Registration URL",
};

function fieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const m = /^(\w+)\.(\d+)(?:\.(\w+))?$/.exec(key);
  if (m) {
    const section = m[1].replace(/_/g, " ").replace(/s$/, "");
    return `${section} #${Number(m[2]) + 1}`;
  }
  return key.replace(/_/g, " ");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function api(method: string, body?: unknown): Promise<any> {
  const p = "/api/admin/events";
  if (method === "POST") return http.post(p, body);
  if (method === "PATCH") return http.patch(p, body);
  if (method === "DELETE") return http.del(p, body);
  return http.get(p);
}

export function EventsClient({
  initial,
  total,
  page,
  pageSize,
}: {
  initial: EventListRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const { isPending, setParams } = useListNav();
  const router = useRouter();
  const [rows, setRows] = useState<EventListRow[]>(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setRows(initial);
  }
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [savingAs, setSavingAs] = useState<EventStatus | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [deleteTarget, setDeleteTarget] = useState<EventListRow | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setMsg(null);
    setErrors({});
  };

  const openEdit = (row: EventListRow) => {
    setEditingId(row.id);
    setForm(rowToForm(row));
    setShowForm(true);
    setMsg(null);
    setErrors({});
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMsg(null);
    setErrors({});
  };

  const run = useCallback(async (fn: () => Promise<void>, okMsg?: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      if (okMsg) setMsg({ kind: "ok", text: okMsg });
    } catch (e) {
      // A 400 from the API carries a per-field map — pin those to their inputs
      // so a server-only rule still lands somewhere the admin can act on.
      if (e instanceof ApiError && e.status === 400) {
        const fields = e.data.fields;
        if (fields && typeof fields === "object") {
          setErrors(fields as FieldErrors);
        }
      }
      setMsg({ kind: "error", text: e instanceof Error ? e.message : "Something went wrong" });
    } finally {
      setBusy(false);
    }
  }, []);

  // Jump to the first flagged input so the admin isn't hunting down the page.
  const focusFirstError = (keys: string[]) => {
    const el = document.querySelector<HTMLElement>(`[data-field="${keys[0]}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.querySelector<HTMLElement>("input, textarea, button")?.focus({ preventScroll: true });
  };

  // Two explicit actions — "Save as draft" and "Publish" — each set the status on save, so admins control visibility with a clear button rather than a.
  const save = (status: EventStatus) => {
    const found = validateForm(form);
    const keys = Object.keys(found);
    if (keys.length > 0) {
      setErrors(found);
      setMsg({
        kind: "error",
        text:
          keys.length === 1
            ? `${fieldLabel(keys[0])}: ${found[keys[0]]}`
            : `${keys.length} fields need attention — see the highlighted inputs below.`,
      });
      focusFirstError(keys);
      return;
    }
    setErrors({});
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
        // Re-fetch the server list so what's shown matches the DB's own order
        // and pagination. Without this, the optimistic row can drift from the
        // server view — a just-published event appeared to vanish until reload.
        router.refresh();
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
      router.refresh();
    });

  const [exporting, setExporting] = useState(false);

  // Export every event (all pages), not just the page on screen.
  const exportCSV = async () => {
    setExporting(true);
    try {
      const data = await fetchAllForExport("/api/admin/events");
      const allRows = (data.events as EventRow[]) ?? [];
      const csv = toCsv(
        ["title", "type", "date", "status", "location"],
        allRows.map((r) => [r.title, r.event_type, r.event_date, r.status, r.location])
      );
      downloadCsv(`events-${Date.now()}.csv`, csv);
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not export CSV." });
    } finally {
      setExporting(false);
    }
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => {
      const next = { ...f, [key]: value };
      // Only re-validate once errors are on screen, so the first pass at the
      // form stays quiet and corrections clear their highlight as you type.
      setErrors((prev) => (Object.keys(prev).length === 0 ? prev : validateForm(next)));
      return next;
    });

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
          <div
            role={msg.kind === "error" ? "alert" : "status"}
            className={cn(
              "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm",
              msg.kind === "error"
                ? "border-pasha-red/30 bg-pasha-red/5 text-pasha-red"
                : "border-tier-featured/30 bg-tier-featured/5 text-tier-featured"
            )}
          >
            {msg.kind === "error" && <AlertCircle className="mt-0.5 w-4 h-4 shrink-0" />}
            <span>{msg.text}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Basic info">
            <Field label="Title *" name="title" error={errors.title}>
              <input className={cn(inputCls, errCls(errors.title))} value={form.title} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <Field label="Short summary (hero)" name="summary" error={errors.summary}>
              <textarea className={cn(textareaCls, errCls(errors.summary))} value={form.summary} onChange={(e) => set("summary", e.target.value)} rows={3} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Type *">
                <SelectMenu className="w-full" value={form.event_type} onValueChange={(v) => set("event_type", v as EventType)} options={EVENT_TYPES} />
              </Field>
              <Field label="Format">
                <SelectMenu className="w-full" value={form.format} onValueChange={(v) => set("format", v as EventFormat)} options={EVENT_FORMATS} />
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
              <Field label="Organizer" name="organizer" error={errors.organizer}>
                <input className={cn(inputCls, errCls(errors.organizer))} value={form.organizer} onChange={(e) => set("organizer", e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title="Schedule & location">
            <Field label="Event date *" name="event_date" error={errors.event_date}>
              <input type="date" className={cn(inputCls, errCls(errors.event_date))} value={form.event_date} onChange={(e) => set("event_date", e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Start time" name="start_time" error={errors.start_time}>
                <input type="time" className={cn(inputCls, errCls(errors.start_time))} value={form.start_time} onChange={(e) => set("start_time", e.target.value)} />
              </Field>
              <Field label="End time" name="end_time" error={errors.end_time}>
                <input type="time" className={cn(inputCls, errCls(errors.end_time))} value={form.end_time} onChange={(e) => set("end_time", e.target.value)} />
              </Field>
              <Field label="Timezone" name="timezone" error={errors.timezone}>
                <SelectMenu className="w-full" value={form.timezone} onValueChange={(v) => set("timezone", v)} options={TIMEZONES} />
              </Field>
            </div>
            <Field label="Venue" name="venue" error={errors.venue}>
              <input className={cn(inputCls, errCls(errors.venue))} value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder="Karachi Expo Centre" />
            </Field>
            <Field label="Location (display)" name="location" error={errors.location}>
              <input className={cn(inputCls, errCls(errors.location))} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Karachi Expo Centre, Karachi" />
            </Field>
            <Field label="Expected attendees" name="expected_attendees" error={errors.expected_attendees}>
              <input className={cn(inputCls, errCls(errors.expected_attendees))} value={form.expected_attendees} onChange={(e) => set("expected_attendees", e.target.value)} placeholder="2,000+" />
            </Field>
          </Section>
        </div>

        <Section title="Registration (display only for now)">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Registration status">
              <SelectMenu className="w-full" value={form.registration_status} onValueChange={(v) => set("registration_status", v as RegistrationStatus)} options={[{ value: "open", label: "Open" }, { value: "closed", label: "Closed" }]} />
            </Field>
            <Field label="Entry type">
              <SelectMenu className="w-full" value={form.entry_type} onValueChange={(v) => set("entry_type", v as EntryType)} options={[{ value: "free", label: "Free" }, { value: "paid", label: "Paid" }]} />
            </Field>
            <Field label="Capacity" name="capacity" error={errors.capacity}>
              <input
                type="text"
                inputMode="numeric"
                className={cn(inputCls, errCls(errors.capacity))}
                value={form.capacity}
                onChange={(e) => set("capacity", e.target.value.replace(/\D/g, ""))}
                placeholder="2000"
              />
            </Field>
            <Field label="Capacity note" name="capacity_note" error={errors.capacity_note}>
              <input className={cn(inputCls, errCls(errors.capacity_note))} value={form.capacity_note} onChange={(e) => set("capacity_note", e.target.value)} placeholder="Seats filling fast" />
            </Field>
          </div>
          <Field label="Registration URL (for later)" name="registration_url" error={errors.registration_url}>
            <input className={cn(inputCls, errCls(errors.registration_url))} value={form.registration_url} onChange={(e) => set("registration_url", e.target.value)} placeholder="https://..." />
          </Field>
        </Section>

        <Section title="About this event">
          <div data-field="about">
            <textarea className={cn(textareaCls, errCls(errors.about))} value={form.about} onChange={(e) => set("about", e.target.value)} rows={8} placeholder="Full event description…" />
            <RowError error={errors.about} />
          </div>
        </Section>

        <DynamicSection
          title="Who should attend"
          onAdd={() => set("audience_items", [...form.audience_items, { title: "", subtitle: "" }])}
        >
          {form.audience_items.map((item, i) => (
            <div key={i} className="flex gap-2 items-start" data-field={`audience_items.${i}.title`}>
              <div className="flex-1 grid gap-2 sm:grid-cols-2">
                <div className="min-w-0">
                  <input className={cn(inputCls, errCls(errors[`audience_items.${i}.title`]))} placeholder="Title" value={item.title} onChange={(e) => {
                    const next = [...form.audience_items];
                    next[i] = { ...item, title: e.target.value };
                    set("audience_items", next);
                  }} />
                  <RowError error={errors[`audience_items.${i}.title`]} />
                </div>
                <div className="min-w-0">
                  <input className={cn(inputCls, errCls(errors[`audience_items.${i}.subtitle`]))} placeholder="Subtitle" value={item.subtitle} onChange={(e) => {
                    const next = [...form.audience_items];
                    next[i] = { ...item, subtitle: e.target.value };
                    set("audience_items", next);
                  }} />
                  <RowError error={errors[`audience_items.${i}.subtitle`]} />
                </div>
              </div>
              <RemoveBtn onClick={() => set("audience_items", form.audience_items.filter((_, j) => j !== i))} />
            </div>
          ))}
        </DynamicSection>

        <DynamicSection
          title="Agenda"
          onAdd={() =>
            set("agenda_items", [
              ...form.agenda_items,
              { time: nextAgendaTime(form.agenda_items), title: "", tag: "networking" },
            ])
          }
        >
          <p className="-mt-1 text-xs text-pasha-muted">
            Times are for the event&rsquo;s local timezone. Rows are sorted into
            chronological order automatically when you save.
          </p>

          {/* Column headers only make sense once the row is laid out
              horizontally — on mobile each field carries its own label. */}
          {form.agenda_items.length > 0 && (
            <div className="hidden sm:flex gap-2 px-1 text-[11px] font-mono uppercase tracking-[1px] text-pasha-muted">
              <span className="w-32 shrink-0">Start time</span>
              <span className="flex-1">Session title</span>
              <span className="w-32 shrink-0">Type</span>
              {form.agenda_items.some((it) => it.tag === "other") && (
                <span className="w-36 shrink-0">Custom label</span>
              )}
              <span className="w-6 shrink-0" aria-hidden />
            </div>
          )}

          {agendaOutOfOrder(form.agenda_items) && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <span>These rows aren&rsquo;t in chronological order.</span>
              <button
                type="button"
                onClick={() => set("agenda_items", sortAgenda(form.agenda_items))}
                className="font-medium underline hover:no-underline"
              >
                Sort now
              </button>
            </div>
          )}

          {/* Mobile: each field stacks full-width inside a bordered card with
              its own label. From `sm` up it collapses into the single
              header-aligned row. */}
          {form.agenda_items.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-pasha-line p-3 space-y-2 sm:rounded-none sm:border-0 sm:p-0 sm:space-y-0 sm:flex sm:gap-2 sm:items-start"
              data-field={`agenda_items.${i}.title`}
            >
              <div className="sm:w-32 sm:shrink-0">
                <span className="mb-1 block text-[11px] font-mono uppercase tracking-[1px] text-pasha-muted sm:hidden">
                  Start time
                </span>
                <input
                  type="time"
                  className={cn(inputCls, "w-full", errCls(errors[`agenda_items.${i}.time`]))}
                  value={item.time}
                  onChange={(e) => {
                    const next = [...form.agenda_items];
                    next[i] = { ...item, time: e.target.value };
                    set("agenda_items", next);
                  }}
                />
                <RowError error={errors[`agenda_items.${i}.time`]} />
                {to12h(item.time) && (
                  <span className="mt-1 block px-1 text-[11px] font-mono text-pasha-muted">
                    {to12h(item.time)}
                  </span>
                )}
              </div>

              <div className="min-w-0 sm:flex-1">
                <span className="mb-1 block text-[11px] font-mono uppercase tracking-[1px] text-pasha-muted sm:hidden">
                  Session title
                </span>
                <input
                  className={cn(inputCls, "w-full", errCls(errors[`agenda_items.${i}.title`]))}
                  placeholder="Session title"
                  value={item.title}
                  onChange={(e) => {
                    const next = [...form.agenda_items];
                    next[i] = { ...item, title: e.target.value };
                    set("agenda_items", next);
                  }}
                />
                <RowError error={errors[`agenda_items.${i}.title`]} />
              </div>

              <div className="min-w-0 sm:w-32 sm:shrink-0">
                <span className="mb-1 block text-[11px] font-mono uppercase tracking-[1px] text-pasha-muted sm:hidden">
                  Type
                </span>
                <SelectMenu
                  className="w-full"
                  value={item.tag}
                  onValueChange={(v) => {
                    const tag = v as AgendaItem["tag"];
                    const next = [...form.agenda_items];
                    // Switching away from "Other" drops the custom label so a
                    // stale value can't resurface if they pick "Other" again.
                    next[i] = { ...item, tag, tag_other: tag === "other" ? item.tag_other ?? "" : "" };
                    set("agenda_items", next);
                  }}
                  options={AGENDA_TAGS}
                />
              </div>

              {item.tag === "other" && (
                <div className="min-w-0 sm:w-36 sm:shrink-0">
                  <span className="mb-1 block text-[11px] font-mono uppercase tracking-[1px] text-pasha-muted sm:hidden">
                    Custom label
                  </span>
                  <input
                    className={cn(inputCls, "w-full", errCls(errors[`agenda_items.${i}.tag_other`]))}
                    placeholder="Specify tag"
                    maxLength={40}
                    value={item.tag_other ?? ""}
                    onChange={(e) => {
                      const next = [...form.agenda_items];
                      next[i] = { ...item, tag_other: e.target.value };
                      set("agenda_items", next);
                    }}
                  />
                  <RowError error={errors[`agenda_items.${i}.tag_other`]} />
                </div>
              )}

              <div className="flex justify-end sm:block sm:shrink-0">
                <RemoveBtn onClick={() => set("agenda_items", form.agenda_items.filter((_, j) => j !== i))} />
              </div>
            </div>
          ))}
        </DynamicSection>

        <DynamicSection
          title="Featured speakers"
          onAdd={() => set("speakers", [...form.speakers, { name: "", role: "", topic: "" }])}
        >
          {form.speakers.map((sp, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] items-start" data-field={`speakers.${i}.name`}>
              <div className="min-w-0">
                <input className={cn(inputCls, errCls(errors[`speakers.${i}.name`]))} placeholder="Name" value={sp.name} onChange={(e) => {
                  const next = [...form.speakers];
                  next[i] = { ...sp, name: e.target.value };
                  set("speakers", next);
                }} />
                <RowError error={errors[`speakers.${i}.name`]} />
              </div>
              <div className="min-w-0">
                <input className={cn(inputCls, errCls(errors[`speakers.${i}.role`]))} placeholder="Role / organization" value={sp.role} onChange={(e) => {
                  const next = [...form.speakers];
                  next[i] = { ...sp, role: e.target.value };
                  set("speakers", next);
                }} />
                <RowError error={errors[`speakers.${i}.role`]} />
              </div>
              <div className="min-w-0">
                <input className={cn(inputCls, errCls(errors[`speakers.${i}.topic`]))} placeholder="Talk topic" value={sp.topic} onChange={(e) => {
                  const next = [...form.speakers];
                  next[i] = { ...sp, topic: e.target.value };
                  set("speakers", next);
                }} />
                <RowError error={errors[`speakers.${i}.topic`]} />
              </div>
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
              <div key={i} className="flex items-start gap-1" data-field={`partners.${i}`}>
                <div>
                  <input className={cn(inputCls, "w-40", errCls(errors[`partners.${i}`]))} placeholder="Partner name" value={p} onChange={(e) => {
                    const next = [...form.partners];
                    next[i] = e.target.value;
                    set("partners", next);
                  }} />
                  <RowError error={errors[`partners.${i}`]} />
                </div>
                <RemoveBtn onClick={() => set("partners", form.partners.filter((_, j) => j !== i))} />
              </div>
            ))}
          </div>
        </DynamicSection>

        {/* Save actions live at the end of the form — the admin reaches them
            after filling everything in, rather than scrolling back up. The
            right padding clears the floating chat button (fixed bottom-5
            right-5, 3.5rem wide). It occupies 4.75rem of the viewport's right
            edge; pr-28 (7rem) leaves a comfortable gutter beside "Publish"
            rather than letting the two nearly touch. */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-pasha-line pt-5 pb-20 sm:pb-6 sm:pr-28">
          <button
            type="button"
            onClick={closeForm}
            className="mr-auto inline-flex items-center gap-2 rounded-full border border-pasha-line bg-white px-5 py-2 text-sm font-medium text-pasha-muted hover:bg-pasha-stone/60 hover:text-pasha-ink"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
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
          <button type="button" onClick={exportCSV} disabled={exporting} className="inline-flex items-center gap-1.5 rounded-lg border border-pasha-line px-3 py-2 text-xs font-medium text-pasha-ink hover:bg-pasha-stone/60 disabled:opacity-60">
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export
          </button>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-full bg-pasha-red px-5 py-2 text-sm font-medium text-white hover:bg-pasha-red-dark">
            <Plus className="w-4 h-4" />
            New event
          </button>
        </div>
      </div>

      {msg && (
        <p className={cn("text-sm", msg.kind === "error" ? "text-pasha-red" : "text-tier-featured")}>
          {msg.text}
        </p>
      )}

      <div className="rounded-2xl border border-pasha-line bg-white overflow-hidden shadow-sm relative">
        <ShimmerOverlay active={isPending} />
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

function Field({
  label,
  children,
  error,
  name,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  name?: string;
}) {
  return (
    <label className="block text-sm text-pasha-ink" data-field={name}>
      <span className={cn(error && "text-pasha-red")}>{label}</span>
      <div className="mt-1.5">{children}</div>
      {error && (
        <span className="mt-1 flex items-start gap-1 text-xs text-pasha-red">
          <AlertCircle className="mt-px w-3 h-3 shrink-0" />
          {error}
        </span>
      )}
    </label>
  );
}

// Red border + focus ring for an input whose field failed validation.
function errCls(error?: string) {
  return error && "border-pasha-red focus:border-pasha-red focus:ring-pasha-red/20";
}

// Inline error under an array-row input (agenda/speakers/audience/partners).
function RowError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <span className="mt-1 flex items-start gap-1 text-xs text-pasha-red">
      <AlertCircle className="mt-px w-3 h-3 shrink-0" />
      {error}
    </span>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 rounded p-2 text-pasha-muted hover:text-pasha-red hover:bg-pasha-red/5">
      <X className="w-4 h-4" />
    </button>
  );
}
