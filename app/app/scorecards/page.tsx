import { ScorecardsClient } from "@/components/scorecards-client";
import { getScorecardStats } from "@/lib/actions";
import { getActor, getScorecardsForActor } from "@/lib/auth/actor";

export default async function ScorecardsPage() {
  const actor = await getActor();
  if (!actor) return null;

  const scorecards = await getScorecardsForActor(actor);
  const statsMap: Record<
    string,
    Awaited<ReturnType<typeof getScorecardStats>>
  > = {};

  for (const sc of scorecards) {
    statsMap[sc.id] = await getScorecardStats(sc.id);
  }

  return (
    <ScorecardsClient
      scorecards={scorecards}
      statsMap={statsMap}
      isGuest={actor.type === "guest"}
    />
  );
}
