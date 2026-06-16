import { createServiceClient } from "@/lib/supabase/server";
import { EventsClient, type EventListRow } from "./EventsClient";

export const dynamic = "force-dynamic";

async function loadEvents(): Promise<EventListRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id,title,summary,about,event_type,status,registration_status,event_date,start_time,end_time,timezone,venue,location,format,organizer,expected_attendees,capacity,capacity_note,entry_type,registration_url,audience_items,agenda_items,speakers,partners,author_email,created_at,updated_at"
    )
    .order("event_date", { ascending: false });

  if (error) {
    if (/events|does not exist/i.test(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    ...row,
    audience_items: Array.isArray(row.audience_items) ? row.audience_items : [],
    agenda_items: Array.isArray(row.agenda_items) ? row.agenda_items : [],
    speakers: Array.isArray(row.speakers) ? row.speakers : [],
    partners: Array.isArray(row.partners) ? row.partners : [],
  })) as EventListRow[];
}

export default async function EventsPage() {
  const events = await loadEvents();
  return <EventsClient initial={events} />;
}
