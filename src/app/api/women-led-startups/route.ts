import { NextResponse } from "next/server";
import { getWomenLedStartups } from "@/lib/women-led.server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 5), 1), 50);

  const { startups, totalCount } = await getWomenLedStartups(limit);
  return NextResponse.json({ startups, totalCount });
}
