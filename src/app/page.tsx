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
import { getWomenLedStartups } from "@/lib/women-led.server";
import { getHomepageAwardWinners } from "@/lib/awards.server";
import { FAQ } from "@/components/landing/FAQ";
import { CTA } from "@/components/landing/CTA";
import { createServiceClient } from "@/lib/supabase/server";
import type { WatchlistStartup } from "@/components/landing/VerifiedStartupsToWatch";
import type { AwardWinningStartup } from "@/components/landing/AwardWinningStartups";
import type { WomenLedStartup } from "@/lib/women-led";

export const dynamic = "force-dynamic";

// Homepage carousels pull a small, capped slice of the databank (≤20 each)
// rather than the full list — keeps the home query light.
const HOME_CAROUSEL_LIMIT = 20;

async function loadHomeData(): Promise<{
  databankCount: number;
  watchlist: WatchlistStartup[];
  awardWinners: AwardWinningStartup[];
  womenLed: { startups: WomenLedStartup[]; totalCount: number };
}> {
  try {
    const supabase = createServiceClient();
    const [countRes, watchlist, curatedAwards, womenLed] = await Promise.all([
      supabase.from("databank").select("*", { count: "exact", head: true }),
      // Admin-curated featured startups (time-boxed) for the homepage carousel.
      getHomepageFeaturedWatchlist(),
      // Admin-curated awards (startup_awards table).
      getHomepageAwardWinners(HOME_CAROUSEL_LIMIT),
      getWomenLedStartups(HOME_CAROUSEL_LIMIT),
    ]);

    // Prefer the curated awards table; fall back to the legacy databank.awards
    // text column when nothing has been curated yet (or pre-migration).
    let awardWinners = curatedAwards;
    if (awardWinners.length === 0) {
      const { data } = await supabase
        .from("databank")
        .select("id,startup_name,primary_industry,city,awards,pasha_verified")
        .not("awards", "is", null)
        .order("pasha_verified", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false, nullsFirst: false })
        .limit(HOME_CAROUSEL_LIMIT);
      awardWinners = (data ?? []) as AwardWinningStartup[];
    }

    return {
      databankCount: countRes.count ?? 0,
      watchlist,
      awardWinners,
      womenLed,
    };
  } catch {
    return { databankCount: 0, watchlist: [], awardWinners: [], womenLed: { startups: [], totalCount: 0 } };
  }
}

export default async function Home() {
  const [{ databankCount, watchlist, awardWinners, womenLed }, upcomingEvents] =
    await Promise.all([loadHomeData(), getUpcomingPublishedEvents(4)]);
  const count = databankCount > 0 ? databankCount : 2481;

  return (
    <>
      <SiteHeader variant="transparent" />
      <main className="flex-1">
        <Hero databankCount={count} />
        <TrustStrip />
        <VerifiedStartupsToWatch startups={watchlist} />
        <WomenFounders startups={womenLed.startups} totalCount={womenLed.totalCount} />
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
