"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ArrowUpRight, Calendar, MapPin } from "lucide-react";
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

const CATEGORY_STYLES: Record<string, string> = {
  Webinar: "bg-teal-500/10 text-teal-700",
  Seminar: "bg-violet-500/10 text-violet-700",
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
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex items-end justify-between gap-6 mb-14 flex-wrap"
        >
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full bg-pasha-red/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-pasha-red">
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
            className="group inline-flex items-center gap-2 rounded-full border border-pasha-line bg-white px-5 py-2.5 text-sm font-medium text-pasha-ink hover:border-pasha-ink/30 hover:bg-pasha-ink hover:text-white transition-all"
          >
            View All Events
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </motion.div>

        {events.length === 0 ? (
          <div className="rounded-2xl border border-pasha-line bg-pasha-stone/20 px-6 py-14 text-center">
            <p className="text-pasha-muted">No upcoming events at the moment. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
            {events.map((event, i) => {
              const category = eventTypeLabel(event.event_type);
              const accent = ACCENTS[i % ACCENTS.length];
              const detailHref = eventHref(event);

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
                  className="group relative flex flex-col h-full rounded-2xl bg-white border border-pasha-line hover:border-pasha-ink/30 hover:shadow-[0_20px_50px_-20px_rgba(14,14,16,0.18)] transition-all duration-300 overflow-hidden"
                >
                  <div className={`h-1 bg-gradient-to-r ${accent}`} />
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex-1">
                      <span
                        className={`inline-flex items-center self-start rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[1px] ${CATEGORY_STYLES[category] ?? "bg-pasha-red/10 text-pasha-red"}`}
                      >
                        {category}
                      </span>

                      <h3 className="mt-3 font-serif text-lg text-pasha-ink leading-tight">
                        <Link href={detailHref} className="hover:text-pasha-red transition-colors">
                          {event.title}
                        </Link>
                      </h3>

                      <div className="mt-3 space-y-2 text-sm text-pasha-muted pb-5">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(parseISO(event.event_date), "MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          {displayLocation(event)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-pasha-line/70 flex items-center justify-between">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[event.registration_status]}`}
                      >
                        {STATUS_LABELS[event.registration_status]}
                      </span>
                      <Link
                        href={detailHref}
                        className="inline-flex items-center gap-1 text-sm font-medium text-pasha-red hover:gap-1.5 transition-all"
                      >
                        {event.registration_status === "open" ? "Register" : "View details"}
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
