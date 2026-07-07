import { createAdminClient } from "@/lib/supabase/admin";
import { fetchEspnHistoricalGames, fetchEspnScoreboard, type EspnGame } from "@/lib/model/espn";
import {
  monteCarloToEventOdds,
  runMonteCarlo,
} from "@/lib/model/monte-carlo";
import { getTeamRating, trainFromGameResult } from "@/lib/model/ratings";
import {
  getSportConfig,
  MODEL_SPORT_KEYS,
  SPORT_MODEL_CONFIGS,
  type SportModelConfig,
} from "@/lib/model/sport-config";

export async function trainModelForSport(sportKey: string, daysBack = 30): Promise<number> {
  const config = getSportConfig(sportKey);
  if (!config) return 0;

  const games = await fetchEspnHistoricalGames(sportKey, daysBack);
  let processed = 0;

  for (const game of games) {
    if (
      !game.completed ||
      game.homeScore == null ||
      game.awayScore == null
    ) {
      continue;
    }

    await trainFromGameResult(
      sportKey,
      game.homeTeam,
      game.awayTeam,
      game.homeScore,
      game.awayScore,
      config,
    );
    processed++;
  }

  if (processed > 0) {
    const admin = createAdminClient();
    await admin.from("model_training_log").insert({
      sport_key: sportKey,
      games_processed: processed,
    });
  }

  return processed;
}

export async function trainAllSports(daysBack = 30): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  for (const sportKey of MODEL_SPORT_KEYS) {
    try {
      results[sportKey] = await trainModelForSport(sportKey, daysBack);
    } catch (err) {
      console.error(`Training failed for ${sportKey}:`, err);
      results[sportKey] = 0;
    }
  }

  return results;
}

async function generateLinesForGame(
  game: EspnGame,
  config: SportModelConfig,
) {
  const homeRating = await getTeamRating(game.sportKey, game.homeTeam);
  const awayRating = await getTeamRating(game.sportKey, game.awayTeam);

  const lines = runMonteCarlo(
    {
      offensive_rating: Number(homeRating.offensive_rating),
      defensive_rating: Number(homeRating.defensive_rating),
      elo: Number(homeRating.elo),
    },
    {
      offensive_rating: Number(awayRating.offensive_rating),
      defensive_rating: Number(awayRating.defensive_rating),
      elo: Number(awayRating.elo),
    },
    config,
  );

  const odds = monteCarloToEventOdds(lines, game.homeTeam, game.awayTeam);

  return {
    event_id: game.id,
    sport_key: game.sportKey,
    commence_time: game.commenceTime,
    home_team: game.homeTeam,
    away_team: game.awayTeam,
    odds,
    completed: game.completed,
    home_score: game.homeScore,
    away_score: game.awayScore,
    synced_at: new Date().toISOString(),
  };
}

export async function syncModelOddsForSport(sportKey: string): Promise<number> {
  const config = getSportConfig(sportKey);
  if (!config) return 0;

  const games = await fetchEspnScoreboard(sportKey);
  const upcoming = games.filter((g) => !g.completed);
  const admin = createAdminClient();
  let count = 0;

  for (const game of upcoming) {
    try {
      const row = await generateLinesForGame(game, config);
      const { error } = await admin.from("cached_events").upsert(row, {
        onConflict: "event_id",
      });
      if (!error) count++;
    } catch (err) {
      console.error(`Line generation failed for ${game.id}:`, err);
    }
  }

  for (const game of games.filter((g) => g.completed)) {
    if (game.homeScore == null || game.awayScore == null) continue;
    await admin
      .from("cached_events")
      .upsert(
        {
          event_id: game.id,
          sport_key: game.sportKey,
          commence_time: game.commenceTime,
          home_team: game.homeTeam,
          away_team: game.awayTeam,
          odds: {},
          completed: true,
          status: "final",
          home_score: game.homeScore,
          away_score: game.awayScore,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "event_id" },
      );
  }

  return count;
}

export async function syncModelSportsList(): Promise<number> {
  const admin = createAdminClient();
  const rows = Object.values(SPORT_MODEL_CONFIGS).map((c) => ({
    key: c.key,
    title: c.label,
    description: "Monte Carlo model lines",
    active: true,
    synced_at: new Date().toISOString(),
  }));

  const { error } = await admin.from("cached_sports").upsert(rows, { onConflict: "key" });
  if (error) throw new Error(error.message);
  return rows.length;
}

export async function syncAllModelOdds(): Promise<number> {
  let total = 0;
  for (const sportKey of MODEL_SPORT_KEYS) {
    try {
      total += await syncModelOddsForSport(sportKey);
    } catch (err) {
      console.error(`Model sync failed for ${sportKey}:`, err);
    }
  }
  return total;
}

export async function syncModelScoresForSettlement(
  sportKey: string,
  dates?: string,
): Promise<EspnGame[]> {
  const games = await fetchEspnScoreboard(sportKey, dates);
  const admin = createAdminClient();

  for (const game of games.filter((g) => g.completed)) {
    if (game.homeScore == null || game.awayScore == null) continue;
    await admin
      .from("cached_events")
      .update({
        completed: true,
        status: "final",
        home_score: game.homeScore,
        away_score: game.awayScore,
        synced_at: new Date().toISOString(),
      })
      .eq("event_id", game.id);
  }

  return games.filter((g) => g.completed);
}

/** Convert ESPN game to settlement score format. */
export function espnGameToScoreResult(game: EspnGame) {
  return {
    id: game.id,
    completed: game.completed,
    home_team: game.homeTeam,
    away_team: game.awayTeam,
    scores: [
      { name: game.homeTeam, score: String(game.homeScore ?? 0) },
      { name: game.awayTeam, score: String(game.awayScore ?? 0) },
    ],
  };
}
