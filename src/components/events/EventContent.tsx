"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowUpRight, Calendar, ChevronDown, Clock, MapPin, Users } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { useState } from "react";
import { cn, initials } from "@/lib/utils";
import { eventSlug } from "@/lib/utils/slug";
import {
  AGENDA_TAG_STYLES,
  AUDIENCE_BORDER_COLORS,
  SPEAKER_AVATAR_COLORS,
  eventTypeLabel,
  formatLabel,
  type EventRow,
} from "@/lib/events/events";

const EASE = [0.22, 1, 0.36, 1] as const;

const containerV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const itemV: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

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
      <div className="rounded-3xl border border-pasha-line bg-white px-6 py-20 text-center">
        <Calendar className="w-10 h-10 text-pasha-red/30 mx-auto mb-4" />
        <p className="font-serif text-lg text-pasha-ink">No upcoming events</p>
        <p className="mt-1 text-sm text-pasha-muted">Check back soon — events are added regularly.</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerV}
      initial="hidden"
      animate="show"
      className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
    >
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </motion.div>
  );
}

function EventCard({ event }: { event: EventRow }) {
  const isOpen = event.registration_status === "open";
  const dateStr = format(parseISO(event.event_date), "MMM d, yyyy");
  const dayStr = format(parseISO(event.event_date), "d");
  const monthStr = format(parseISO(event.event_date), "MMM").toUpperCase();

  return (
    <motion.div
      variants={itemV}
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="group relative flex flex-col"
    >
      <Link
        href={`/events/${eventSlug(event.title, event.id)}`}
        className="absolute inset-0 z-10 rounded-3xl focus-visible:outline-none"
      />

      <div className="relative flex flex-col flex-1 rounded-3xl overflow-hidden border border-pasha-line/50 bg-white shadow-[0_2px_16px_rgba(14,14,16,0.06)] group-hover:shadow-[0_20px_60px_-12px_rgba(14,14,16,0.14)] group-hover:border-pasha-red/20 transition-all duration-500">

        {/* Hero panel */}
        <div className="relative h-32 bg-pasha-stone overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(14,14,16,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(14,14,16,0.04)_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full bg-pasha-red/[0.10] blur-2xl group-hover:bg-pasha-red/[0.18] transition-all duration-500" />
          <div className="absolute -top-4 left-1/3 w-24 h-24 rounded-full bg-pasha-red/[0.04] blur-xl" />
          {/* Shine sweep */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />

          {/* Date block — left */}
          <div className="absolute top-4 left-5 flex flex-col items-start">
            <span className="text-[10px] font-mono uppercase tracking-[2px] text-pasha-red">{monthStr}</span>
            <span className="font-serif text-4xl leading-none text-pasha-ink font-bold">{dayStr}</span>
          </div>

          {/* Status + type — right */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {isOpen && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[1px] text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Open
              </span>
            )}
            <span className="rounded-full bg-white/80 border border-pasha-line/60 px-2.5 py-1 text-[9px] font-mono uppercase tracking-[1px] text-pasha-muted">
              {eventTypeLabel(event.event_type)}
            </span>
          </div>

          {/* Bottom line */}
          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-pasha-red/20 to-transparent" />
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 px-5 pt-4 pb-5 gap-2">
          <h2 className="font-serif text-lg text-pasha-ink leading-snug line-clamp-2 group-hover:text-pasha-red transition-colors duration-200">
            {event.title}
          </h2>

          {event.summary && (
            <p className="text-sm text-pasha-muted/70 leading-relaxed line-clamp-2">
              {event.summary}
            </p>
          )}

          <div className="flex-1" />

          {/* Meta */}
          <div className="mt-3 pt-3 border-t border-pasha-line/40 flex flex-wrap gap-x-4 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs text-pasha-muted/70">
              <Calendar className="w-3.5 h-3.5 text-pasha-red/50 shrink-0" />
              {dateStr}
            </span>
            {event.location && (
              <span className="inline-flex items-center gap-1.5 text-xs text-pasha-muted/70">
                <MapPin className="w-3.5 h-3.5 text-pasha-red/50 shrink-0" />
                {event.location}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-pasha-line/30 bg-pasha-stone/30 group-hover:bg-pasha-red/[0.03] group-hover:border-pasha-red/10 flex items-center justify-between transition-all duration-300">
          <span className="text-xs font-semibold text-pasha-muted/50 group-hover:text-pasha-red/60 transition-colors">
            View Event
          </span>
          <span className="w-7 h-7 rounded-full border border-pasha-line/50 group-hover:border-pasha-red/30 group-hover:bg-pasha-red group-hover:text-white grid place-items-center text-pasha-muted/30 transition-all duration-300">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </motion.div>
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
      <section className="relative overflow-hidden bg-pasha-ink pt-14 pb-16 sm:pt-16 sm:pb-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
        />
        <div aria-hidden className="pointer-events-none absolute -right-56 -top-72 h-[720px] w-[720px] rounded-full bg-pasha-red/[0.32] blur-[80px]" />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-56 -right-16 select-none font-serif font-black leading-none text-white/[0.02]"
          style={{ fontSize: "clamp(20rem,34vw,36rem)" }}
        >
          @
        </span>

        <div className="relative site-container">
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

          <h1 className="mt-6 font-serif text-[2rem] leading-[0.96] sm:text-6xl lg:text-[5.5rem] lg:leading-[0.9] font-extrabold text-white text-balance max-w-4xl">
            {event.title}
          </h1>

          {event.summary && (
            <p className="mt-6 text-base sm:text-lg text-white/60 max-w-2xl leading-relaxed text-pretty">
              {event.summary}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/60">
            <span className="inline-flex items-center gap-2">
              <Calendar className="w-4 h-4 text-pasha-red-light" />
              {format(parseISO(event.event_date), "MMMM d, yyyy")}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock className="w-4 h-4 text-pasha-red-light" />
              {timeRange(event.start_time, event.end_time, event.timezone)}
            </span>
            {(event.location || event.venue) && (
              <span className="inline-flex items-center gap-2">
                <MapPin className="w-4 h-4 text-pasha-red-light" />
                {event.location || event.venue}
              </span>
            )}
            {event.expected_attendees && (
              <span className="inline-flex items-center gap-2">
                <Users className="w-4 h-4 text-pasha-red-light" />
                {event.expected_attendees} Expected Attendees
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="site-container py-12 sm:py-16">
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
