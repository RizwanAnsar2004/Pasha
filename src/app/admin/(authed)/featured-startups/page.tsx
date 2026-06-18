import { getFeaturedSettings, getFeaturedForAdmin } from "@/lib/featured-startups.server";
import {
  FeaturedStartupsClient,
  type FeaturedEntry,
} from "./FeaturedStartupsClient";
import { parsePagination } from "@/lib/pagination";

export const dynamic = "force-dynamic";

function pickOne(sp: Record<string, string | string[] | undefined>, k: string): string {
  const v = sp[k];
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function FeaturedStartupsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pagination = parsePagination(sp);
  const filters = {
    q: pickOne(sp, "q"),
    status: pickOne(sp, "status") || "all",
  };
  const [featured, settings] = await Promise.all([
    getFeaturedForAdmin({ from: pagination.from, to: pagination.to }, filters),
    getFeaturedSettings(),
  ]);

  return (
    <FeaturedStartupsClient
      initialFeatured={featured.rows as FeaturedEntry[]}
      initialSettings={settings}
      total={featured.total}
      page={pagination.page}
      pageSize={pagination.pageSize}
      filters={filters}
    />
  );
}
