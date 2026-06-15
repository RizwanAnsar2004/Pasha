import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Hero } from "@/components/landing/Hero";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { FeaturedStartups } from "@/components/landing/FeaturedStartups";
import { Pillars } from "@/components/landing/Pillars";
import { Process } from "@/components/landing/Process";
import { Criteria } from "@/components/landing/Criteria";
import { FAQ } from "@/components/landing/FAQ";
import { CTA } from "@/components/landing/CTA";
import { createServiceClient } from "@/lib/supabase/server";
import type { FeaturedStartup } from "@/components/landing/FeaturedStartups";
import type { HeroDeckStartup } from "@/components/landing/Hero";

export const revalidate = 60;

async function loadHomeData(): Promise<{ databankCount: number; featured: FeaturedStartup[]; deck: HeroDeckStartup[] }> {
  try {
    const supabase = createServiceClient();
    const cols = "id,startup_name,tagline,primary_industry,city,logo_url,current_revenue,total_employees,number_of_customers,pasha_verified";
    const [countRes, featuredRes, deckRes] = await Promise.all([
      supabase.from("databank").select("*", { count: "exact", head: true }),
      supabase
        .from("databank")
        .select(cols)
        .order("pasha_verified", { ascending: false, nullsFirst: false })
        .order("current_revenue", { ascending: false, nullsFirst: false })
        .limit(5),
      supabase
        .from("databank")
        .select("id,startup_name,primary_industry,city,current_revenue,total_employees,number_of_customers,pasha_verified")
        .order("pasha_verified", { ascending: false, nullsFirst: false })
        .order("number_of_customers", { ascending: false, nullsFirst: false })
        .limit(5),
    ]);
    return {
      databankCount: countRes.count ?? 0,
      featured: (featuredRes.data ?? []) as FeaturedStartup[],
      deck: (deckRes.data ?? []) as HeroDeckStartup[],
    };
  } catch {
    return { databankCount: 0, featured: [], deck: [] };
  }
}

export default async function Home() {
  const { databankCount, featured, deck } = await loadHomeData();
  const count = databankCount > 0 ? databankCount : 2481;

  return (
    <>
      <SiteHeader variant="transparent" />
      <main className="flex-1">
        <Hero databankCount={count} deck={deck} />
        <TrustStrip />
        <FeaturedStartups startups={featured} />
        <Pillars />
        <Process />
        <Criteria />
        <FAQ />
        <CTA />
      </main>
      <SiteFooter />
    </>
  );
}
