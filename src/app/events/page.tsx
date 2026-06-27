import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EventsList } from "@/components/events/EventContent";
import { getPublishedEvents } from "@/lib/events.server";
import { EventsHero } from "@/components/events/EventsHero";


export const metadata: Metadata = {
  title: "Events",
  description:
    "Webinars, seminars, and community events from the P@SHA Startup Ecosystem Community.",
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
        <section className="mx-auto max-w-7xl px-5 sm:px-8 py-14 sm:py-20">
          <EventsList events={events} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
