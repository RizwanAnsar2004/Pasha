export type EventType = "webinar" | "seminar";
export type EventFormat = "in_person" | "online";
export type EventStatus = "draft" | "published";
export type RegistrationStatus = "open" | "closed";
export type EntryType = "free" | "paid";

export type AgendaTag =
  | "networking"
  | "keynote"
  | "panel"
  | "break"
  | "demo"
  | "workshop"
  | "other";

export type AudienceItem = {
  title: string;
  subtitle: string;
};

export type AgendaItem = {
  time: string;
  title: string;
  tag: AgendaTag;
  // Free-text label used only when `tag` is "other" — lets an admin name a
  // session type the fixed list doesn't cover (e.g. "Fireside").
  tag_other?: string;
};

export type Speaker = {
  name: string;
  role: string;
  topic: string;
};

export type EventRow = {
  id: string;
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
  capacity: number | null;
  capacity_note: string;
  entry_type: EntryType;
  registration_url: string | null;
  audience_items: AudienceItem[];
  agenda_items: AgendaItem[];
  speakers: Speaker[];
  partners: string[];
  author_email: string | null;
  created_at: string;
  updated_at: string | null;
};

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "webinar", label: "Webinar" },
  { value: "seminar", label: "Seminar" },
];

export const EVENT_FORMATS: { value: EventFormat; label: string }[] = [
  { value: "in_person", label: "In-Person" },
  { value: "online", label: "Online" },
];

export const AGENDA_TAGS: { value: AgendaTag; label: string }[] = [
  { value: "networking", label: "Networking" },
  { value: "keynote", label: "Keynote" },
  { value: "panel", label: "Panel" },
  { value: "break", label: "Break" },
  { value: "demo", label: "Demo" },
  { value: "workshop", label: "Workshop" },
  { value: "other", label: "Other" },
];

export const AGENDA_TAG_STYLES: Record<AgendaTag, string> = {
  networking: "bg-amber-50 text-amber-700",
  keynote: "bg-red-50 text-red-700",
  panel: "bg-violet-50 text-violet-700",
  break: "bg-pasha-stone text-pasha-muted",
  demo: "bg-sky-50 text-sky-700",
  workshop: "bg-emerald-50 text-emerald-700",
  other: "bg-pasha-stone/80 text-pasha-ink/70",
};

export const AUDIENCE_BORDER_COLORS = [
  "border-l-pasha-red",
  "border-l-emerald-500",
  "border-l-teal-500",
  "border-l-violet-500",
  "border-l-amber-500",
  "border-l-orange-500",
];

export const SPEAKER_AVATAR_COLORS = [
  "bg-pasha-red",
  "bg-teal-600",
  "bg-violet-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-orange-600",
];

export function eventTypeLabel(type: EventType) {
  return EVENT_TYPES.find((t) => t.value === type)?.label ?? type;
}

// Display label for an agenda row's tag — the custom text when the admin chose
// "Other" and filled one in, otherwise the fixed list's label.
export function agendaTagLabel(item: AgendaItem): string {
  if (item.tag === "other" && item.tag_other?.trim()) return item.tag_other.trim();
  return AGENDA_TAGS.find((t) => t.value === item.tag)?.label ?? item.tag;
}

export function formatLabel(format: EventFormat) {
  return EVENT_FORMATS.find((f) => f.value === format)?.label ?? format;
}
