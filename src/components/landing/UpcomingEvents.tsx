"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Calendar, MapPin } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

type EventCategory = "Events" | "Webinars" | "Seminars";
type EventStatus = "Open" | "Coming Soon";

type UpcomingEvent = {
  category: EventCategory;
  title: string;
  date: string;
  location: string;
  status: EventStatus;
  accent: string;
};

// Static placeholder content — swap for a Supabase "events" table when one exists.
const EVENTS: UpcomingEvent[] = [
  {
    category: "Events",
    title: "P@SHA Tech Summit 2025",
    date: "Jan 25, 2025",
    location: "Karachi Expo Centre",
    status: "Open",
    accent: "from-red-500 to-rose-500",
  },
  {
    category: "Webinars",
    title: "Fundraising for Early-Stage Startups",
    date: "Jan 18, 2025",
    location: "Online · Zoom",
    status: "Open",
    accent: "from-teal-500 to-cyan-500",
  },
  {
    category: "Events",
    title: "Startup Demo Day Q1 2025",
    date: "Feb 5, 2025",
    location: "LUMS, Lahore",
    status: "Coming Soon",
    accent: "from-red-500 to-orange-500",
  },
  {
    category: "Seminars",
    title: "Export Readiness for Tech Startups",
    date: "Jan 30, 2025",
    location: "Online + Islamabad",
    status: "Open",
    accent: "from-violet-500 to-purple-500",
  },
];

const CATEGORY_STYLES: Record<EventCategory, string> = {
  Events: "bg-pasha-red/10 text-pasha-red",
  Webinars: "bg-teal-500/10 text-teal-700",
  Seminars: "bg-violet-500/10 text-violet-700",
};

const STATUS_STYLES: Record<EventStatus, string> = {
  Open: "bg-emerald-500/10 text-emerald-700",
  "Coming Soon": "bg-amber-500/10 text-amber-700",
};

export function UpcomingEvents() {
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
            href="/resources"
            className="group inline-flex items-center gap-2 rounded-full border border-pasha-line bg-white px-5 py-2.5 text-sm font-medium text-pasha-ink hover:border-pasha-ink/30 hover:bg-pasha-ink hover:text-white transition-all"
          >
            View All Resources
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {EVENTS.map((event, i) => (
            <motion.div
              key={event.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
              className="group relative flex flex-col h-full rounded-2xl bg-white border border-pasha-line hover:border-pasha-ink/30 hover:shadow-[0_20px_50px_-20px_rgba(14,14,16,0.18)] transition-all duration-300 overflow-hidden"
            >
              <div className={`h-1 bg-gradient-to-r ${event.accent}`} />
              <div className="p-5 flex flex-col flex-1">
                <span
                  className={`inline-flex items-center self-start rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[1px] ${CATEGORY_STYLES[event.category]}`}
                >
                  {event.category}
                </span>

                <h3 className="mt-3 font-serif text-lg text-pasha-ink leading-tight">
                  {event.title}
                </h3>

                <div className="mt-3 space-y-1.5 text-sm text-pasha-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {event.date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {event.location}
                  </span>
                </div>

                <div className="mt-auto pt-4 border-t border-pasha-line/70 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[event.status]}`}
                  >
                    {event.status}
                  </span>
                  <Link
                    href="/resources"
                    className="inline-flex items-center gap-1 text-sm font-medium text-pasha-red hover:gap-1.5 transition-all"
                  >
                    Register
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
