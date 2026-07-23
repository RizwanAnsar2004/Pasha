import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EventDetailContent } from "@/components/events/EventContent";
import { getEventBySlug, getRelatedEvents } from "@/lib/events/events.server";
import { eventSlug } from "@/lib/utils/slug";

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
      title: `${event.title} · PASHA Events`,
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

  const related = await getRelatedEvents(event.id);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="site-container py-5">
          <Link
            href="/events"
            className="group inline-flex items-center gap-2.5 rounded-full border border-pasha-ink/10 bg-white py-1.5 pl-1.5 pr-5 font-mono text-[11px] font-bold uppercase tracking-[1.5px] text-pasha-ink/55 transition-all duration-300 hover:-translate-y-0.5 hover:border-pasha-red/30 hover:text-pasha-red"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pasha-stone text-pasha-ink/60 transition-colors group-hover:bg-pasha-red group-hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            All events
          </Link>
        </div>
        <EventDetailContent event={event} related={related} />
      </main>
      <SiteFooter />
    </>
  );
}
