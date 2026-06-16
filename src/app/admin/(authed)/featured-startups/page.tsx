import { getFeaturedSettings, getFeaturedForAdmin } from "@/lib/featured-startups.server";
import {
  FeaturedStartupsClient,
  type FeaturedEntry,
} from "./FeaturedStartupsClient";

export const dynamic = "force-dynamic";

export default async function FeaturedStartupsPage() {
  const [featured, settings] = await Promise.all([
    getFeaturedForAdmin(),
    getFeaturedSettings(),
  ]);

  return (
    <FeaturedStartupsClient
      initialFeatured={featured as FeaturedEntry[]}
      initialSettings={settings}
    />
  );
}
