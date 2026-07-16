import { settlePendingBets } from "@/app/api/cron/settle-bets/route";
import { withCronLock } from "@/lib/cron/lock";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Settle only the active visitor's pending bets when they open a betting page.
 * The lock prevents duplicate work from concurrent page loads or refreshes.
 */
export async function settleScorecardBetsOnVisit(scorecardId: string) {
  const allowed = await checkRateLimit(
    `on-visit-settlement:scorecard:${scorecardId}`,
    1,
    60_000,
  );
  if (!allowed) return;

  const { error } = await withCronLock(
    `settle-scorecard-${scorecardId}`,
    () => settlePendingBets(scorecardId),
    60_000,
  );

  if (error) {
    console.error(`On-visit settlement failed for scorecard ${scorecardId}:`, error);
  }
}
