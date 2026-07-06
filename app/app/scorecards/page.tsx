import { ScorecardsClient } from "@/components/scorecards-client";
import { getScorecardStats } from "@/lib/actions";
import { getActor, getScorecardsForActor } from "@/lib/auth/actor";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Scorecard, Tournament, TournamentRole } from "@/lib/types";

type TournamentScorecard = Scorecard & {
  tournament: Pick<Tournament, "id" | "name" | "status" | "starts_at" | "ends_at">;
  role: TournamentRole;
};

export default async function ScorecardsPage() {
  const actor = await getActor();
  if (!actor) return null;

  const scorecards = await getScorecardsForActor(actor);
  const tournamentScorecards: TournamentScorecard[] = [];
  const statsMap: Record<
    string,
    Awaited<ReturnType<typeof getScorecardStats>>
  > = {};

  for (const sc of scorecards) {
    statsMap[sc.id] = await getScorecardStats(sc.id);
  }

  if (actor.type === "user") {
    const admin = createAdminClient();
    const { data: participations, error: participationsError } = await admin
      .from("tournament_participants")
      .select("role, tournament_id, scorecard_id")
      .eq("user_id", actor.userId!)
      .order("joined_at", { ascending: false });

    if (participationsError) throw new Error(participationsError.message);

    const scorecardIds = participations?.map((p) => p.scorecard_id) ?? [];
    const tournamentIds = participations?.map((p) => p.tournament_id) ?? [];

    if (scorecardIds.length > 0 && tournamentIds.length > 0) {
      const [{ data: tournamentCards, error: scorecardsError }, { data: tournaments, error: tournamentsError }] =
        await Promise.all([
          admin.from("scorecards").select("*").in("id", scorecardIds),
          admin
            .from("tournaments")
            .select("id, name, status, starts_at, ends_at")
            .in("id", tournamentIds),
        ]);

      if (scorecardsError) throw new Error(scorecardsError.message);
      if (tournamentsError) throw new Error(tournamentsError.message);

      const scorecardsById = new Map(
        ((tournamentCards ?? []) as Scorecard[]).map((scorecard) => [
          scorecard.id,
          scorecard,
        ]),
      );
      const tournamentsById = new Map(
        ((tournaments ?? []) as TournamentScorecard["tournament"][]).map(
          (tournament) => [tournament.id, tournament],
        ),
      );

      for (const participation of participations ?? []) {
        const scorecard = scorecardsById.get(participation.scorecard_id);
        const tournament = tournamentsById.get(participation.tournament_id);

        if (scorecard && tournament) {
          tournamentScorecards.push({
            ...scorecard,
            tournament,
            role: participation.role as TournamentRole,
          });
          statsMap[scorecard.id] = await getScorecardStats(scorecard.id);
        }
      }
    }
  }

  return (
    <ScorecardsClient
      scorecards={scorecards}
      tournamentScorecards={tournamentScorecards}
      statsMap={statsMap}
      isGuest={actor.type === "guest"}
    />
  );
}
