import { getAwardsForAdmin } from "@/lib/awards.server";
import { parsePagination } from "@/lib/pagination";
import { AwardsClient } from "./AwardsClient";

export const dynamic = "force-dynamic";

export default async function AwardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { page, pageSize, from, to } = parsePagination(sp);
  const q = typeof sp.q === "string" ? sp.q : "";
  const source = typeof sp.source === "string" ? sp.source : "all";

  const { rows, total } = await getAwardsForAdmin({ from, to }, { q, source });

  return (
    <AwardsClient
      initial={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      filters={{ q, source }}
    />
  );
}
