import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EventsList } from "@/components/events/EventContent";
import { getPublishedEvents } from "@/lib/events.server";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Webinars, seminars, and community events from the P@SHA Startup Ecosystem Community.",
  alternates: { canonical: "/events" },
};

export const revalidate = 60;

export default async function EventsPage() {
  const events = await getPublishedEvents();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-pasha-line bg-pasha-stone/30">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 py-12 sm:py-16">
            <p className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-red">
              Community
            </p>
            <h1 className="mt-3 font-serif text-3xl sm:text-4xl tracking-tight text-pasha-ink">
              Events
            </h1>
            <p className="mt-3 max-w-2xl text-pasha-muted">
              Webinars, seminars, and gatherings for founders, investors, and ecosystem enablers across Pakistan.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 sm:px-8 py-10 sm:py-14">
          <EventsList events={events} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
