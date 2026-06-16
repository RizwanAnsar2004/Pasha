import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Hero } from "@/components/landing/Hero";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { VerifiedStartupsToWatch } from "@/components/landing/VerifiedStartupsToWatch";
import { WomenFounders } from "@/components/landing/WomenFounders";
import { AwardWinningStartups } from "@/components/landing/AwardWinningStartups";
import { Pillars } from "@/components/landing/Pillars";
import { Process } from "@/components/landing/Process";
import { Criteria } from "@/components/landing/Criteria";
import { CommitteeBanner } from "@/components/landing/CommitteeBanner";
import { UpcomingEvents } from "@/components/landing/UpcomingEvents";
import { getUpcomingPublishedEvents } from "@/lib/events.server";
import { getHomepageFeaturedWatchlist } from "@/lib/featured-startups.server";
import { FAQ } from "@/components/landing/FAQ";
import { CTA } from "@/components/landing/CTA";
import { createServiceClient } from "@/lib/supabase/server";
import type { WatchlistStartup } from "@/components/landing/VerifiedStartupsToWatch";
import type { WomenFounderStartup } from "@/components/landing/WomenFounders";
import type { AwardWinningStartup } from "@/components/landing/AwardWinningStartups";

export const revalidate = 60;

type KeyPerson = { name?: string; gender?: string; [key: string]: unknown };

function isWomanLed(keyPersons: unknown): boolean {
  if (!Array.isArray(keyPersons)) return false;
  return keyPersons.some(
    (p) => typeof p === "object" && p !== null && (p as KeyPerson).gender?.toLowerCase() === "female"
  );
}

function primaryFounderName(keyPersons: unknown): string | null {
  if (!Array.isArray(keyPersons)) return null;
  const woman = keyPersons.find(
    (p) => typeof p === "object" && p !== null && (p as KeyPerson).gender?.toLowerCase() === "female"
  ) as KeyPerson | undefined;
  return woman?.name ?? null;
}

async function loadHomeData(): Promise<{
  databankCount: number;
  watchlist: WatchlistStartup[];
  womenFounders: WomenFounderStartup[];
  womenFoundersCount: number;
  awardWinners: AwardWinningStartup[];
}> {
  try {
    const supabase = createServiceClient();
    const [countRes, watchlist, keyPersonsRes, awardsRes] = await Promise.all([
      supabase.from("databank").select("*", { count: "exact", head: true }),
      getHomepageFeaturedWatchlist(),
      supabase
        .from("databank")
        .select("id,startup_name,primary_industry,key_persons,pasha_verified,created_at")
        .not("key_persons", "is", null)
        .order("pasha_verified", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false, nullsFirst: false })
        .limit(1000),
      supabase
        .from("databank")
        .select("id,startup_name,primary_industry,city,awards,pasha_verified")
        .not("awards", "is", null)
        .order("pasha_verified", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false, nullsFirst: false })
        .limit(20),
    ]);

    const womenLed = (keyPersonsRes.data ?? []).filter((row) => isWomanLed(row.key_persons));
    const womenFounders: WomenFounderStartup[] = womenLed.slice(0, 5).map((row) => ({
      id: row.id,
      startup_name: row.startup_name,
      founder_name: primaryFounderName(row.key_persons),
      primary_industry: row.primary_industry,
    }));

    return {
      databankCount: countRes.count ?? 0,
      watchlist,
      womenFounders,
      womenFoundersCount: womenLed.length,
      awardWinners: (awardsRes.data ?? []) as AwardWinningStartup[],
    };
  } catch {
    return { databankCount: 0, watchlist: [], womenFounders: [], womenFoundersCount: 0, awardWinners: [] };
  }
}

export default async function Home() {
  const [{ databankCount, watchlist, womenFounders, womenFoundersCount, awardWinners }, upcomingEvents] =
    await Promise.all([loadHomeData(), getUpcomingPublishedEvents(4)]);
  const count = databankCount > 0 ? databankCount : 2481;

  return (
    <>
      <SiteHeader variant="transparent" />
      <main className="flex-1">
        <Hero databankCount={count} />
        <TrustStrip />
        <VerifiedStartupsToWatch startups={watchlist} />
        <WomenFounders startups={womenFounders} totalCount={womenFoundersCount} />
        <AwardWinningStartups startups={awardWinners} />
        <Pillars />
        <Process />
        <Criteria />
        <CommitteeBanner />
        <UpcomingEvents events={upcomingEvents} />
        <FAQ />
        <CTA />
      </main>
      <SiteFooter />
    </>
  );
}
