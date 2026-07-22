import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EventsList } from "@/components/events/EventContent";
import { getPublishedEvents } from "@/lib/events/events.server";
import { EventsHero } from "@/components/events/EventsHero";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Webinars, seminars, and community events from the PASHA Startup Ecosystem Community.",
  alternates: { canonical: "/events" },
};

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await getPublishedEvents();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <EventsHero totalEvents={events.length} />
        <section id="events" className="site-container py-14 sm:py-20">
          <EventsList events={events} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
