import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron/auth";
import { withCronLock } from "@/lib/cron/lock";
import { generateAllModelLines } from "@/lib/model/generate-lines";
import { isModelComparisonEnabled } from "@/lib/odds/provider";

/** Generate optional PaperWager Model comparison lines (does not replace market odds). */
export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  if (!isModelComparisonEnabled()) {
    return NextResponse.json({ skipped: true, reason: "MODEL_LINES_ENABLED=false" });
  }

  const { skipped, result, error } = await withCronLock("generate-model-lines", () =>
    generateAllModelLines(),
  );

  if (skipped) {
    return NextResponse.json({ skipped: true, reason: "Job already running" });
  }
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({
    eventsUpdated: result,
    syncedAt: new Date().toISOString(),
  });
}

export const dynamic = "force-dynamic";
