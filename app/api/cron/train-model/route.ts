import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron/auth";
import { withCronLock } from "@/lib/cron/lock";
import { trainAllSports, trainModelForSport } from "@/lib/model/sync";
import { MODEL_SPORT_KEYS } from "@/lib/model/sport-config";

/** Daily model training from ESPN historical results — separate from odds sync. */
export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const sportKey = searchParams.get("sportKey");
  const daysBack = parseInt(process.env.MODEL_TRAIN_DAYS ?? "30", 10);

  if (sportKey) {
    if (!MODEL_SPORT_KEYS.includes(sportKey)) {
      return NextResponse.json(
        { error: `Unknown sportKey. Valid keys: ${MODEL_SPORT_KEYS.join(", ")}` },
        { status: 400 },
      );
    }

    const { skipped, result, error } = await withCronLock(
      `train-model-${sportKey}`,
      () => trainModelForSport(sportKey, daysBack),
      10 * 60 * 1000,
    );

    if (skipped) {
      return NextResponse.json({ skipped: true, reason: "Job already running" });
    }
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sportKey,
      gamesProcessed: result,
      daysBack,
      trainedAt: new Date().toISOString(),
    });
  }

  const { skipped, result, error } = await withCronLock(
    "train-model",
    () => trainAllSports(daysBack),
    30 * 60 * 1000,
  );

  if (skipped) {
    return NextResponse.json({ skipped: true, reason: "Job already running" });
  }
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    daysBack,
    results: result,
    trainedAt: new Date().toISOString(),
    herokuNote:
      "On Heroku, schedule one request per sportKey to avoid the 30s router timeout.",
    sportKeys: MODEL_SPORT_KEYS,
  });
}

export const dynamic = "force-dynamic";
