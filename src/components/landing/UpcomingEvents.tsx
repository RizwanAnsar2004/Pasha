import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowUpRight, Clock, MapPin, Users } from "lucide-react";
import { eventSlug } from "@/lib/utils/slug";
import { eventTypeLabel, formatLabel, type EventRow } from "@/lib/events/events";
import { Kicker } from "./shared/Kicker";
import { Reveal } from "./shared/Reveal";

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
  const event = events[0];
  if (!event) return null;

  const date = parseISO(event.event_date);

  return (
    <section id="events" className="relative overflow-hidden bg-accent-coral/[0.08] py-20 sm:py-28">
      <div className="site-container">
        <Reveal className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.4fr] gap-8 lg:gap-14 items-center">
          <div className="text-center lg:text-left">
            <span className="block font-serif font-black text-pasha-ink leading-none text-[clamp(6rem,12vw,10rem)]">
              {format(date, "d")}
            </span>
            <span className="mt-2 block text-sm font-mono uppercase tracking-[2px] text-pasha-ink/50">
              {format(date, "MMMM")} &middot; {displayLocation(event)}
            </span>
          </div>

          <div className="rounded-[28px] bg-white border border-pasha-ink/10 p-8 sm:p-10">
            <Kicker>Upcoming event</Kicker>
            <h2 className="mt-4 font-serif text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-pasha-ink text-balance">
              {event.title}
            </h2>
            {event.summary && (
              <p className="mt-4 text-lg text-pasha-muted leading-relaxed text-pretty">{event.summary}</p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-pasha-ink/60">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-pasha-red" />
                {event.start_time || eventTypeLabel(event.event_type)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-pasha-red" />
                {displayLocation(event)}
              </span>
              {event.capacity && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-pasha-red" />
                  {event.capacity} seats
                </span>
              )}
            </div>

            <Link
              href={eventHref(event)}
              className="group mt-8 inline-flex items-center gap-2 rounded-full bg-pasha-red px-6 py-3 text-sm font-medium text-white hover:bg-pasha-red-dark transition-colors"
            >
              Reserve your seat
              <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
