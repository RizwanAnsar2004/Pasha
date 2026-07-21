import { createServiceClient } from "@/lib/supabase/server";
import { EventsClient, type EventListRow } from "./EventsClient";
import { parsePagination } from "@/lib/utils/pagination";

export const dynamic = "force-dynamic";

async function loadEvents(params: { from: number; to: number }) {
  const supabase = createServiceClient();
  const { data, count, error } = await supabase
    .from("events")
    .select(
      "id,title,summary,about,event_type,status,registration_status,event_date,start_time,end_time,timezone,venue,location,format,organizer,expected_attendees,capacity,capacity_note,entry_type,registration_url,audience_items,agenda_items,speakers,partners,author_email,created_at,updated_at",
      { count: "exact" }
    )
    .order("event_date", { ascending: false })
    .range(params.from, params.to);

  if (error) {
    if (/events|does not exist/i.test(error.message)) return { rows: [] as EventListRow[], total: 0 };
    throw new Error(error.message);
  }

  const rows = (data ?? []).map((row) => ({
    ...row,
    audience_items: Array.isArray(row.audience_items) ? row.audience_items : [],
    agenda_items: Array.isArray(row.agenda_items) ? row.agenda_items : [],
    speakers: Array.isArray(row.speakers) ? row.speakers : [],
    partners: Array.isArray(row.partners) ? row.partners : [],
  })) as EventListRow[];
  return { rows, total: count ?? 0 };
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pagination = parsePagination(sp);
  const { rows, total } = await loadEvents(pagination);
  return (
    <EventsClient
      initial={rows}
      total={total}
      page={pagination.page}
      pageSize={pagination.pageSize}
    />
  );
}
