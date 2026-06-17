import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EventDetailContent } from "@/components/events/EventContent";
import { getEventBySlug, getRelatedEvents } from "@/lib/events.server";
import { eventSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Event not found" };

  return {
    title: event.title,
    description: event.summary || event.about.slice(0, 160),
    alternates: { canonical: `/events/${eventSlug(event.title, event.id)}` },
    openGraph: {
      title: `${event.title} · P@SHA Events`,
      description: event.summary || undefined,
      url: `/events/${eventSlug(event.title, event.id)}`,
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const related = await getRelatedEvents(event.id, event.event_type);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 pt-6">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-sm text-pasha-muted hover:text-pasha-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All events
          </Link>
        </div>
        <EventDetailContent event={event} related={related} />
      </main>
      <SiteFooter />
    </>
  );
}
