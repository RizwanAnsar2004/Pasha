import { NextResponse } from "next/server";
import { getWomenLedStartups } from "@/lib/startups/directory/women-led.server";
import { CACHE_NS, withCache } from "@/lib/cache/index.server";

export const dynamic = "force-dynamic";

async function getHandler(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 5), 1), 50);

  const { startups, totalCount } = await getWomenLedStartups(limit);
  return NextResponse.json({ startups, totalCount });
}

// --- Redis cache wiring: read-through on GET, namespace invalidation on writes. ---
export const GET = withCache(CACHE_NS.womenLed, getHandler);
