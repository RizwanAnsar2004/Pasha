import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Hero } from "@/components/landing/Hero";
import { HomeSearchProvider } from "@/components/landing/HomeSearchProvider";
import { NewsTicker } from "@/components/landing/NewsTicker";
import { DirectoryBento } from "@/components/landing/DirectoryBento";
import { WomenFounders } from "@/components/landing/WomenFounders";
import { AwardWinningStartups } from "@/components/landing/AwardWinningStartups";
import { Manifesto } from "@/components/landing/Manifesto";
import { JoinCTA } from "@/components/landing/JoinCTA";
import { Ecosystem } from "@/components/landing/Ecosystem";
import { NewsCarousel } from "@/components/landing/NewsCarousel";
import { UpcomingEvents } from "@/components/landing/UpcomingEvents";
import { getUpcomingPublishedEvents } from "@/lib/events/events.server";
import { getHomepageFeaturedWatchlist, getHomepageVerifiedWatchlist, getHomepageRecentWatchlist } from "@/lib/startups/directory/featured-startups.server";
import { getWomenLedStartups } from "@/lib/startups/directory/women-led.server";
import { getHomepageAwardWinners } from "@/lib/startups/awards/awards.server";
import { FAQ } from "@/components/landing/FAQ";
import { CTA } from "@/components/landing/CTA";
import { createServiceClient } from "@/lib/supabase/server";
import { getFormOptionRegistry } from "@/lib/options/registry.server";
import { getOptionIndex } from "@/lib/options/index.server";
import { resolveOptionLabel } from "@/lib/options/resolve";
import { JoinCommunity } from "@/components/community/JoinCommunity";
import type { WatchlistStartup } from "@/components/landing/DirectoryBento";
import type { AwardWinningStartup } from "@/components/landing/AwardWinningStartups";
import type { WomenLedStartup } from "@/lib/startups/directory/women-led";

export const dynamic = "force-dynamic";

// Homepage carousels pull a small, capped slice of the databank (≤20 each) rather than the full list — keeps the home query light.
const HOME_CAROUSEL_LIMIT = 20;
// The directory bento shows 1 spotlight + 4 mini cards.
const BENTO_MIN = 5;

async function loadHomeData(): Promise<{
  databankCount: number;
  watchlist: WatchlistStartup[];
  awardWinners: AwardWinningStartup[];
  womenLed: { startups: WomenLedStartup[]; totalCount: number };
}> {
  try {
    const supabase = createServiceClient();
    const [countRes, curatedWatchlist, curatedAwards, womenLed] = await Promise.all([
      supabase.from("databank").select("*", { count: "exact", head: true }),
      // Admin-curated featured startups (time-boxed) for the homepage bento.
      getHomepageFeaturedWatchlist(),
      // Admin-curated awards (startup_awards table).
      getHomepageAwardWinners(HOME_CAROUSEL_LIMIT),
      getWomenLedStartups(HOME_CAROUSEL_LIMIT),
    ]);

    // Top up with verified startups when curation hasn't filled the bento yet, so the "Featured startups" section never looks sparse.
    let watchlist = curatedWatchlist;
    if (watchlist.length < BENTO_MIN) {
      const verified = await getHomepageVerifiedWatchlist(HOME_CAROUSEL_LIMIT);
      const seen = new Set(watchlist.map((s) => s.id));
      watchlist = [...watchlist, ...verified.filter((s) => !seen.has(s.id))];
    }
    // Still short (curated + verified pool is small)?
    if (watchlist.length < BENTO_MIN) {
      const recent = await getHomepageRecentWatchlist(HOME_CAROUSEL_LIMIT);
      const seen = new Set(watchlist.map((s) => s.id));
      watchlist = [...watchlist, ...recent.filter((s) => !seen.has(s.id))];
    }

    // Prefer the curated awards table; fall back to the legacy databank.awards text column when nothing has been curated yet (or pre-migration).
    let awardWinners = curatedAwards;
    if (awardWinners.length === 0) {
      const { data } = await supabase
        .from("databank")
        .select("id,startup_name,primary_industry,city,awards,pasha_verified")
        .not("awards", "is", null)
        .order("pasha_verified", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false, nullsFirst: false })
        .limit(HOME_CAROUSEL_LIMIT);
      const index = await getOptionIndex();
      awardWinners = ((data ?? []) as AwardWinningStartup[]).map((s) => ({
        ...s,
        primary_industry: resolveOptionLabel(index, "SECTORS", s.primary_industry),
        city: resolveOptionLabel(index, "HQ_CITIES", s.city),
      }));
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
  const [{ databankCount, watchlist, awardWinners, womenLed }, upcomingEvents, optionRegistry, optionIndex] =
    await Promise.all([
      loadHomeData(),
      getUpcomingPublishedEvents(4),
      getFormOptionRegistry(),
      getOptionIndex(),
    ]);
  const count = databankCount > 0 ? databankCount : 2481;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <HomeSearchProvider>
          <Hero
            databankCount={count}
            sectors={optionRegistry.SECTORS ?? []}
            stages={optionRegistry.STAGES ?? []}
          />
          <NewsTicker />
          <DirectoryBento startups={watchlist} optionIndex={optionIndex} />
        </HomeSearchProvider>
        {/* Community CTA sits high on the page, right after the directory */}
        <JoinCommunity />
        <WomenFounders startups={womenLed.startups} totalCount={womenLed.totalCount} />
        <AwardWinningStartups startups={awardWinners} />
        <Manifesto />
        <JoinCTA />
        <Ecosystem />
        {/* <NewsCarousel /> */}
        <UpcomingEvents events={upcomingEvents} />
        <FAQ />
        <CTA />
      </main>
      <SiteFooter />
    </>
  );
}
