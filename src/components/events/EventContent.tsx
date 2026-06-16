"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Calendar, ChevronDown, Clock, MapPin, Users } from "lucide-react";
import { useState } from "react";
import { cn, initials } from "@/lib/utils";
import { eventSlug } from "@/lib/slug";
import {
  AGENDA_TAG_STYLES,
  AUDIENCE_BORDER_COLORS,
  SPEAKER_AVATAR_COLORS,
  eventTypeLabel,
  formatLabel,
  type EventRow,
} from "@/lib/events";

function formatTime12h(time: string) {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr ?? "", 10);
  const m = parseInt(mStr ?? "0", 10);
  if (!Number.isFinite(h)) return time;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function timeRange(start: string, end: string, tz: string) {
  return `${formatTime12h(start)} – ${formatTime12h(end)} ${tz}`;
}

export function EventsList({ events }: { events: EventRow[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-pasha-line bg-white px-6 py-16 text-center">
        <p className="text-pasha-muted">No upcoming events at the moment. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {events.map((event) => (
        <Link
          key={event.id}
          href={`/events/${eventSlug(event.title, event.id)}`}
          className="group rounded-2xl border border-pasha-line bg-white p-6 shadow-sm hover:border-pasha-red/30 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-pasha-red/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[1px] text-pasha-red">
              {eventTypeLabel(event.event_type)}
            </span>
            {event.registration_status === "open" && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[1px] text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Open
              </span>
            )}
          </div>
          <h2 className="mt-3 font-serif text-xl text-pasha-ink group-hover:text-pasha-red transition-colors">
            {event.title}
          </h2>
          {event.summary && (
            <p className="mt-2 text-sm text-pasha-muted line-clamp-2">{event.summary}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-pasha-muted">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {format(parseISO(event.event_date), "MMMM d, yyyy")}
            </span>
            {event.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {event.location}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

export function EventDetailContent({
  event,
  related,
}: {
  event: EventRow;
  related: EventRow[];
}) {
  const [agendaOpen, setAgendaOpen] = useState(true);

  const aboutParagraphs = event.about
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      <section className="bg-pasha-ink text-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14 sm:py-20">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md bg-pasha-red px-2.5 py-1 text-[10px] font-mono uppercase tracking-[2px] text-white">
              {eventTypeLabel(event.event_type)}
            </span>
            {event.registration_status === "open" && (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-mono uppercase tracking-[1px] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Open for Registration
              </span>
            )}
          </div>

          <h1 className="mt-6 font-serif text-3xl sm:text-4xl lg:text-5xl tracking-tight max-w-4xl">
            {event.title}
          </h1>

          {event.summary && (
            <p className="mt-5 text-base sm:text-lg text-white/70 max-w-3xl leading-relaxed">
              {event.summary}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/60">
            <span className="inline-flex items-center gap-2">
              <Calendar className="w-4 h-4 text-pasha-red" />
              {format(parseISO(event.event_date), "MMMM d, yyyy")}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock className="w-4 h-4 text-pasha-red" />
              {timeRange(event.start_time, event.end_time, event.timezone)}
            </span>
            {(event.location || event.venue) && (
              <span className="inline-flex items-center gap-2">
                <MapPin className="w-4 h-4 text-pasha-red" />
                {event.location || event.venue}
              </span>
            )}
            {event.expected_attendees && (
              <span className="inline-flex items-center gap-2">
                <Users className="w-4 h-4 text-pasha-red" />
                {event.expected_attendees} Expected Attendees
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <div className="space-y-10 min-w-0">
            {aboutParagraphs.length > 0 && (
              <div>
                <h2 className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-red">
                  About This Event
                </h2>
                <div className="mt-4 space-y-4 text-pasha-muted leading-relaxed">
                  {aboutParagraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
            )}

            {event.audience_items.length > 0 && (
              <div>
                <h2 className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-red">
                  Who Should Attend
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {event.audience_items.map((item, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-xl border border-pasha-line bg-white px-4 py-3 border-l-4",
                        AUDIENCE_BORDER_COLORS[i % AUDIENCE_BORDER_COLORS.length]
                      )}
                    >
                      <p className="font-medium text-pasha-ink">{item.title}</p>
                      {item.subtitle && (
                        <p className="mt-0.5 text-xs text-pasha-muted">{item.subtitle}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {event.agenda_items.length > 0 && (
              <div className="rounded-2xl border border-pasha-line bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAgendaOpen((o) => !o)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <h2 className="font-serif text-lg text-pasha-ink">Agenda</h2>
                  <ChevronDown className={cn("w-5 h-5 text-pasha-muted transition-transform", agendaOpen && "rotate-180")} />
                </button>
                {agendaOpen && (
                  <div className="border-t border-pasha-line divide-y divide-pasha-line">
                    {event.agenda_items.map((item, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                        <span className="w-24 shrink-0 text-xs font-mono text-pasha-muted">
                          {formatTime12h(item.time)}
                        </span>
                        <span className="flex-1 text-sm text-pasha-ink">{item.title}</span>
                        <span className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-mono uppercase tracking-[1px]",
                          AGENDA_TAG_STYLES[item.tag] ?? AGENDA_TAG_STYLES.other
                        )}>
                          {item.tag}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {event.speakers.length > 0 && (
              <div>
                <h2 className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-red">
                  Featured Speakers
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {event.speakers.map((sp, i) => (
                    <div key={i} className="rounded-2xl border border-pasha-line bg-white p-5">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white",
                          SPEAKER_AVATAR_COLORS[i % SPEAKER_AVATAR_COLORS.length]
                        )}>
                          {initials(sp.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-pasha-ink">{sp.name}</p>
                          {sp.role && <p className="text-xs text-pasha-red mt-0.5">{sp.role}</p>}
                        </div>
                      </div>
                      {sp.topic && (
                        <p className="mt-3 text-xs text-pasha-muted italic">&ldquo;{sp.topic}&rdquo;</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {event.partners.length > 0 && (
              <div>
                <h2 className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-red">
                  Event Partners
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {event.partners.map((p, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-pasha-line bg-white px-4 py-2 text-sm text-pasha-ink"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl bg-pasha-red p-5 text-white">
              <p className="text-sm font-medium">
                {event.registration_status === "open" ? "Open" : "Closed"}
                {event.entry_type === "free" ? " — Free Entry" : " — Paid Entry"}
              </p>
              {event.capacity_note && (
                <p className="mt-2 text-xs text-white/70">{event.capacity_note}</p>
              )}
              {event.capacity && (
                <p className="mt-1 text-xs text-white/70">{event.capacity.toLocaleString()} capacity</p>
              )}
            </div>

            <div className="rounded-2xl border border-pasha-line bg-white p-5 space-y-4">
              <h3 className="font-serif text-base text-pasha-ink">Event Details</h3>
              <dl className="space-y-3 text-sm">
                <DetailRow icon={<Calendar className="w-4 h-4" />} label={format(parseISO(event.event_date), "MMMM d, yyyy")} />
                <DetailRow icon={<Clock className="w-4 h-4" />} label={timeRange(event.start_time, event.end_time, event.timezone)} />
                {(event.venue || event.location) && (
                  <DetailRow icon={<MapPin className="w-4 h-4" />} label={event.venue || event.location} />
                )}
                <DetailRow icon={<Users className="w-4 h-4" />} label={formatLabel(event.format)} />
                {event.organizer && (
                  <DetailRow icon={<Users className="w-4 h-4" />} label={event.organizer} />
                )}
              </dl>
            </div>

            {related.length > 0 && (
              <div className="rounded-2xl border border-pasha-line bg-white p-5">
                <h3 className="font-serif text-base text-pasha-ink">Related Events</h3>
                <ul className="mt-4 space-y-3">
                  {related.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/events/${eventSlug(r.title, r.id)}`}
                        className="group block"
                      >
                        <p className="text-sm font-medium text-pasha-ink group-hover:text-pasha-red transition-colors">
                          {r.title}
                        </p>
                        <p className="text-[11px] text-pasha-muted mt-0.5">
                          {eventTypeLabel(r.event_type)} · {format(parseISO(r.event_date), "MMM d, yyyy")}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}

function DetailRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-start gap-3 text-pasha-muted">
      <span className="text-pasha-red shrink-0 mt-0.5">{icon}</span>
      <span>{label}</span>
    </div>
  );
}
