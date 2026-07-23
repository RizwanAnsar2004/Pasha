import { createServiceClient } from "@/lib/supabase/server";
import { idPrefixFromSlug } from "@/lib/utils/slug";
import type { EventRow } from "@/lib/events/events";

const EVENT_COLS =
  "id,title,summary,about,event_type,status,registration_status,event_date,start_time,end_time,timezone,venue,location,format,organizer,expected_attendees,capacity,capacity_note,entry_type,registration_url,audience_items,agenda_items,speakers,partners,author_email,created_at,updated_at";

function normalizeEvent(row: Record<string, unknown>): EventRow {
  return {
    ...row,
    audience_items: Array.isArray(row.audience_items) ? row.audience_items : [],
    agenda_items: Array.isArray(row.agenda_items) ? row.agenda_items : [],
    speakers: Array.isArray(row.speakers) ? row.speakers : [],
    partners: Array.isArray(row.partners) ? row.partners : [],
  } as EventRow;
}

function isMissingTable(msg: string) {
  return /events|does not exist/i.test(msg);
}

function nextHex(hex: string): string | null {
  const n = parseInt(hex, 16);
  if (!Number.isFinite(n) || n >= 0xffffffff) return null;
  return (n + 1).toString(16).padStart(8, "0");
}

async function fetchEventByIdPrefix(prefix: string, publishedOnly: boolean) {
  const lower = `${prefix}-0000-0000-0000-000000000000`;
  const upperPrefix = nextHex(prefix);
  if (!upperPrefix) return null;
  const upper = `${upperPrefix}-0000-0000-0000-000000000000`;

  const supabase = createServiceClient();
  let query = supabase
    .from("events")
    .select(EVENT_COLS)
    .gte("id", lower)
    .lt("id", upper)
    .limit(1);

  if (publishedOnly) query = query.eq("status", "published");

  const { data, error } = await query.maybeSingle();
  if (error) {
    if (isMissingTable(error.message)) return null;
    throw new Error(error.message);
  }
  return data ? normalizeEvent(data as Record<string, unknown>) : null;
}

export async function getEventsForAdmin(): Promise<EventRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLS)
    .order("event_date", { ascending: false });

  if (error) {
    if (isMissingTable(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((r) => normalizeEvent(r as Record<string, unknown>));
}

// Published events that haven't happened yet — for the public /events page.
export async function getPublishedEvents(limit = 50): Promise<EventRow[]> {
  const today = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLS)
    .eq("status", "published")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(limit);

  if (error) {
    if (isMissingTable(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((r) => normalizeEvent(r as Record<string, unknown>));
}

// Published events on or after today, soonest first — for landing promos.
export async function getUpcomingPublishedEvents(limit = 4): Promise<EventRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLS)
    .eq("status", "published")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(limit);

  if (error) {
    if (isMissingTable(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((r) => normalizeEvent(r as Record<string, unknown>));
}

export async function getEventById(id: string): Promise<EventRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error.message)) return null;
    throw new Error(error.message);
  }
  return data ? normalizeEvent(data as Record<string, unknown>) : null;
}

export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  const prefix = idPrefixFromSlug(slug);
  if (!prefix) return null;
  return fetchEventByIdPrefix(prefix, true);
}

// Recommendations for an event's sidebar: the next upcoming published events,
// soonest first, excluding the one being viewed. Deliberately not filtered by
// event_type — any upcoming event is a better recommendation than an empty
// panel, and the type filter would blank the section on one-off event types.
export async function getRelatedEvents(
  currentId: string,
  limit = 3
): Promise<EventRow[]> {
  const today = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLS)
    .eq("status", "published")
    .neq("id", currentId)
    // Soonest first, and nothing in the past — matches the /events listing, so
    // a recommendation never points at an event that has already happened.
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(limit);

  if (error) {
    // A failing sidebar must not take down the event page, so this degrades to
    // "no recommendations" — but a real query error is worth seeing in the
    // server log rather than vanishing silently.
    if (!isMissingTable(error.message)) {
      console.error("getRelatedEvents:", error.message);
    }
    return [];
  }
  return (data ?? []).map((r) => normalizeEvent(r as Record<string, unknown>));
}
