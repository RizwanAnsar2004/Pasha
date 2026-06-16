import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSessionClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-allowlist";

const audienceItemSchema = z.object({
  title: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(200).default(""),
});

const agendaItemSchema = z.object({
  time: z.string().trim().min(1).max(20),
  title: z.string().trim().min(1).max(300),
  tag: z.enum(["networking", "keynote", "panel", "break", "demo", "workshop", "other"]),
});

const speakerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().max(200).default(""),
  topic: z.string().trim().max(300).default(""),
});

const eventFieldsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(500).default(""),
  about: z.string().trim().max(10000).default(""),
  event_type: z.enum(["webinar", "seminar"]),
  status: z.enum(["draft", "published"]).default("draft"),
  registration_status: z.enum(["open", "closed"]).default("open"),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().trim().min(1).max(20),
  end_time: z.string().trim().min(1).max(20),
  timezone: z.string().trim().min(1).max(20).default("PKT"),
  venue: z.string().trim().max(200).default(""),
  location: z.string().trim().max(300).default(""),
  format: z.enum(["in_person", "online"]),
  organizer: z.string().trim().max(200).default("P@SHA Committee"),
  expected_attendees: z.string().trim().max(100).default(""),
  capacity: z.number().int().positive().nullable().optional(),
  capacity_note: z.string().trim().max(200).default(""),
  entry_type: z.enum(["free", "paid"]).default("free"),
  registration_url: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  audience_items: z.array(audienceItemSchema).max(12).default([]),
  agenda_items: z.array(agendaItemSchema).max(50).default([]),
  speakers: z.array(speakerSchema).max(24).default([]),
  partners: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
});

const createSchema = eventFieldsSchema;
const patchSchema = eventFieldsSchema.extend({ id: z.string().uuid() });
const deleteSchema = z.object({ id: z.string().uuid() });

const EVENT_COLS =
  "id,title,summary,about,event_type,status,registration_status,event_date,start_time,end_time,timezone,venue,location,format,organizer,expected_attendees,capacity,capacity_note,entry_type,registration_url,audience_items,agenda_items,speakers,partners,author_email,created_at,updated_at";

async function requireAdmin() {
  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user || !(await isAdminEmail(user.email))) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user, error: null };
}

async function safeJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function GET() {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const supabase = createServiceClient();
  const { data, error: dbErr } = await supabase
    .from("events")
    .select(EVENT_COLS)
    .order("event_date", { ascending: false });

  if (dbErr) {
    if (/events|does not exist/i.test(dbErr.message)) {
      return NextResponse.json({ events: [] });
    }
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}

export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const parsed = createSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data, error: insErr } = await supabase
    .from("events")
    .insert({
      ...parsed.data,
      capacity: parsed.data.capacity ?? null,
      registration_url: parsed.data.registration_url ?? null,
      author_email: user.email,
    })
    .select(EVENT_COLS)
    .single();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}

export async function PATCH(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const parsed = patchSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }

  const { id, ...fields } = parsed.data;
  const supabase = createServiceClient();
  const { data, error: updErr } = await supabase
    .from("events")
    .update({
      ...fields,
      capacity: fields.capacity ?? null,
      registration_url: fields.registration_url ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(EVENT_COLS)
    .single();

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ event: data });
}

export async function DELETE(req: Request) {
  const { user, error } = await requireAdmin();
  if (!user) return error!;

  const parsed = deleteSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error: delErr } = await supabase.from("events").delete().eq("id", parsed.data.id);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
