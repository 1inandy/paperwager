import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron/auth";
import { withCronLock } from "@/lib/cron/lock";
import { syncAllMarketOdds } from "@/lib/odds/market-sync";
import { isOddsApiEnabled } from "@/lib/odds/provider";

/** Sync real bookmaker odds from The Odds API (market default). */
export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  if (!isOddsApiEnabled()) {
    return NextResponse.json({
      error: "ODDS_API_KEY required for market odds. Set ODDS_PROVIDER=api.",
      skipped: true,
    });
  }

  const { skipped, result, error } = await withCronLock("sync-market-odds", () =>
    syncAllMarketOdds(),
  );

  if (skipped) {
    return NextResponse.json({ skipped: true, reason: "Job already running" });
  }
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({
    provider: "api",
    ...result,
    syncedAt: new Date().toISOString(),
  });
}

export const dynamic = "force-dynamic";
