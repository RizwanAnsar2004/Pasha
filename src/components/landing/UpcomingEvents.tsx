"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ArrowUpRight, Calendar, MapPin, CalendarDays } from "lucide-react";
import { eventSlug } from "@/lib/slug";
import {
  eventTypeLabel,
  formatLabel,
  type EventRow,
  type RegistrationStatus,
} from "@/lib/events";

const EASE = [0.22, 1, 0.36, 1] as const;

const ACCENTS = [
  "from-red-500 to-rose-500",
  "from-teal-500 to-cyan-500",
  "from-red-500 to-orange-500",
  "from-violet-500 to-purple-500",
];

const containerV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.08 } },
};

const rowV: Variants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE } },
};

const CATEGORY_STYLES: Record<string, string> = {
  Webinar: "bg-teal-500/10 text-teal-700 ring-teal-500/15",
  Seminar: "bg-violet-500/10 text-violet-700 ring-violet-500/15",
};

const STATUS_STYLES: Record<RegistrationStatus, string> = {
  open: "bg-emerald-500/10 text-emerald-700",
  closed: "bg-amber-500/10 text-amber-700",
};

const STATUS_LABELS: Record<RegistrationStatus, string> = {
  open: "Open",
  closed: "Closed",
};

function displayLocation(event: EventRow): string {
  if (event.location?.trim()) return event.location.trim();
  if (event.venue?.trim()) return event.venue.trim();
  if (event.format === "online") return "Online";
  return formatLabel(event.format);
}

function eventHref(event: EventRow): string {
  return `/events/${eventSlug(event.title, event.id)}`;
}

export function UpcomingEvents({ events }: { events: EventRow[] }) {
  return (
    <section className="relative bg-white border-b border-pasha-line py-20 sm:py-28 overflow-hidden">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 right-1/4 w-[520px] h-[520px] rounded-full bg-violet-500/[0.05] blur-[130px] animate-float-slower" />
        <div className="absolute -bottom-32 -left-20 w-[480px] h-[480px] rounded-full bg-pasha-red/[0.04] blur-[130px] animate-float-slow" />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex items-end justify-between gap-6 mb-14 flex-wrap"
        >
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pasha-red/10 ring-1 ring-inset ring-pasha-red/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-pasha-red">
              <CalendarDays className="w-3 h-3" />
              Resources
            </span>
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl lg:text-5xl tracking-tight text-pasha-ink text-balance">
              Upcoming Events, Webinars &amp; Seminars
            </h2>
            <p className="mt-4 text-pasha-muted text-lg leading-relaxed text-pretty">
              Stay connected with Pakistan&apos;s startup ecosystem through our
              curated calendar of events and learning opportunities.
            </p>
          </div>
          <Link
            href="/events"
            className="group inline-flex items-center gap-2 rounded-full border border-pasha-line bg-white/80 backdrop-blur px-5 py-2.5 text-sm font-medium text-pasha-ink shadow-sm hover:border-pasha-ink/30 hover:bg-pasha-ink hover:text-white hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            View All Events
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </motion.div>

        {events.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-pasha-line bg-pasha-stone/30 px-6 py-16 text-center">
            <Calendar className="w-8 h-8 mx-auto text-pasha-muted/50" />
            <p className="mt-3 text-pasha-muted">No upcoming events at the moment. Check back soon.</p>
          </div>
        ) : (
          <motion.ol
            variants={containerV}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="relative ml-1 sm:ml-3 border-l-2 border-pasha-line"
          >
            {events.map((event, i) => {
              const category = eventTypeLabel(event.event_type);
              const accent = ACCENTS[i % ACCENTS.length];
              const detailHref = eventHref(event);
              const date = parseISO(event.event_date);

              return (
                <motion.li key={event.id} variants={rowV} className="relative pl-6 sm:pl-10 pb-8 last:pb-0">
                  {/* Timeline node */}
                  <span className="absolute -left-[9px] top-1.5 flex items-center justify-center">
                    <span className={`w-4 h-4 rounded-full bg-gradient-to-br ${accent} ring-4 ring-white shadow-sm`} />
                  </span>

                  <div className="group relative rounded-2xl bg-white border border-pasha-line/80 shadow-[0_1px_3px_rgba(14,14,16,0.04)] hover:border-pasha-ink/15 hover:shadow-[0_22px_55px_-26px_rgba(14,14,16,0.28)] transition-[box-shadow,border-color] duration-500 overflow-hidden">
                    <div aria-hidden className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${accent} opacity-0 group-hover:opacity-[0.05] transition-opacity duration-500`} />
                    <div className="relative z-0 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                      {/* Date block */}
                      <div className="flex sm:flex-col items-center gap-2 sm:gap-0 sm:w-16 shrink-0 sm:text-center">
                        <span className="text-[11px] font-mono uppercase tracking-[1.5px] text-pasha-red font-semibold leading-none">
                          {format(date, "MMM")}
                        </span>
                        <span className="font-serif text-3xl text-pasha-ink leading-none sm:mt-1">
                          {format(date, "d")}
                        </span>
                        <span className="text-[11px] text-pasha-muted leading-none sm:mt-1">
                          {format(date, "yyyy")}
                        </span>
                      </div>

                      <span aria-hidden className="hidden sm:block w-px self-stretch bg-pasha-line/70" />

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center rounded-full ring-1 ring-inset px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[1px] ${CATEGORY_STYLES[category] ?? "bg-pasha-red/10 text-pasha-red ring-pasha-red/15"}`}>
                            {category}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[event.registration_status]}`}>
                            {event.registration_status === "open" && (
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping-soft" />
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              </span>
                            )}
                            {STATUS_LABELS[event.registration_status]}
                          </span>
                        </div>
                        <h3 className="mt-2.5 font-serif text-xl text-pasha-ink leading-tight">
                          <Link href={detailHref} className="hover:text-pasha-red transition-colors">
                            {event.title}
                          </Link>
                        </h3>
                        <span className="mt-2 inline-flex items-center gap-1.5 text-sm text-pasha-muted">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          {displayLocation(event)}
                        </span>
                      </div>

                      {/* Action */}
                      <Link
                        href={detailHref}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-pasha-ink px-4 py-2 text-sm font-medium text-white hover:bg-pasha-red transition-colors self-start sm:self-center"
                      >
                        {event.registration_status === "open" ? "Details" : "Details"}
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </motion.ol>
        )}
      </div>
    </section>
  );
}
