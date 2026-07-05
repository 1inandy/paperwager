import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron/auth";
import { withCronLock } from "@/lib/cron/lock";
import { syncAllMarketOdds } from "@/lib/odds/market-sync";
import { generateAllModelLines } from "@/lib/model/generate-lines";
import { isModelComparisonEnabled, isOddsApiEnabled } from "@/lib/odds/provider";
import { syncAllModelOdds, syncModelSportsList } from "@/lib/model/sync";

/**
 * Orchestrator — runs market sync + optional model comparison.
 * Does NOT train the model (see /api/cron/train-model).
 */
export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  const { skipped, result, error } = await withCronLock("sync-odds", async () => {
    if (isOddsApiEnabled()) {
      const market = await syncAllMarketOdds();
      let modelEvents = 0;
      if (isModelComparisonEnabled()) {
        modelEvents = await generateAllModelLines();
      }
      return { provider: "api" as const, ...market, modelEvents };
    }

    const sportsCount = await syncModelSportsList();
    const eventsCount = await syncAllModelOdds();
    return { provider: "model" as const, sportsCount, eventsCount, modelEvents: 0 };
  });

  if (skipped) {
    return NextResponse.json({ skipped: true, reason: "Job already running" });
  }
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ success: true, ...result, syncedAt: new Date().toISOString() });
}

export const dynamic = "force-dynamic";
