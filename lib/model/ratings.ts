import { createAdminClient } from "@/lib/supabase/admin";
import { expectedPoints } from "@/lib/model/monte-carlo";
import type { SportModelConfig } from "@/lib/model/sport-config";

export interface TeamRating {
  sport_key: string;
  team_name: string;
  offensive_rating: number;
  defensive_rating: number;
  elo: number;
  games_played: number;
  updated_at: string;
}

const DEFAULT_RATING = {
  offensive_rating: 100,
  defensive_rating: 100,
  elo: 1500,
  games_played: 0,
};

export async function getTeamRating(
  sportKey: string,
  teamName: string,
): Promise<TeamRating> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("team_ratings")
    .select("*")
    .eq("sport_key", sportKey)
    .eq("team_name", teamName)
    .maybeSingle();

  if (data) return data as TeamRating;

  return {
    sport_key: sportKey,
    team_name: teamName,
    ...DEFAULT_RATING,
    updated_at: new Date().toISOString(),
  };
}

export async function upsertTeamRating(rating: Omit<TeamRating, "updated_at">) {
  const admin = createAdminClient();
  await admin.from("team_ratings").upsert(
    {
      ...rating,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "sport_key,team_name" },
  );
}

/** Train ratings from a completed game using Elo + offensive/defensive EMA. */
export async function trainFromGameResult(
  sportKey: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  config: SportModelConfig,
): Promise<void> {
  const home = await getTeamRating(sportKey, homeTeam);
  const away = await getTeamRating(sportKey, awayTeam);

  const alpha = config.learningRate;
  const leagueAvg = config.leagueAvgPoints;

  const homeOffTarget = (homeScore / leagueAvg) * 100;
  const homeDefTarget = (awayScore / leagueAvg) * 100;
  const awayOffTarget = (awayScore / leagueAvg) * 100;
  const awayDefTarget = (homeScore / leagueAvg) * 100;

  const newHomeOff = home.offensive_rating * (1 - alpha) + homeOffTarget * alpha;
  const newHomeDef = home.defensive_rating * (1 - alpha) + homeDefTarget * alpha;
  const newAwayOff = away.offensive_rating * (1 - alpha) + awayOffTarget * alpha;
  const newAwayDef = away.defensive_rating * (1 - alpha) + awayDefTarget * alpha;

  const homeWon = homeScore > awayScore;
  const draw = homeScore === awayScore;
  const homeActual = draw ? 0.5 : homeWon ? 1 : 0;

  const homeExpectedWin = eloExpectedScore(home.elo, away.elo, config.homeAdvantage);
  const awayExpectedWin = 1 - homeExpectedWin;

  const newHomeElo = home.elo + config.eloK * (homeActual - homeExpectedWin);
  const newAwayElo = away.elo + config.eloK * ((1 - homeActual) - awayExpectedWin);

  await upsertTeamRating({
    sport_key: sportKey,
    team_name: homeTeam,
    offensive_rating: clampRating(newHomeOff),
    defensive_rating: clampRating(newHomeDef),
    elo: newHomeElo,
    games_played: home.games_played + 1,
  });

  await upsertTeamRating({
    sport_key: sportKey,
    team_name: awayTeam,
    offensive_rating: clampRating(newAwayOff),
    defensive_rating: clampRating(newAwayDef),
    elo: newAwayElo,
    games_played: away.games_played + 1,
  });
}

function eloExpectedScore(eloA: number, eloB: number, homeAdv = 1): number {
  const adjustedA = eloA + (homeAdv - 1) * 100;
  return 1 / (1 + Math.pow(10, (eloB - adjustedA) / 400));
}

function clampRating(value: number): number {
  return Math.round(Math.min(130, Math.max(70, value)) * 100) / 100;
}

export async function getRatingsCount(sportKey?: string): Promise<number> {
  const admin = createAdminClient();
  let query = admin.from("team_ratings").select("*", { count: "exact", head: true });
  if (sportKey) query = query.eq("sport_key", sportKey);
  const { count } = await query;
  return count ?? 0;
}

export async function getLatestTrainingLog() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("model_training_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

/** Log expected vs actual for debugging model calibration. */
export function calibrationError(
  home: TeamRating,
  away: TeamRating,
  homeScore: number,
  awayScore: number,
  config: SportModelConfig,
): number {
  const expHome = expectedPoints(
    home.offensive_rating,
    away.defensive_rating,
    config,
    config.homeAdvantage,
  );
  const expAway = expectedPoints(away.offensive_rating, home.defensive_rating, config);
  return Math.abs(homeScore - expHome) + Math.abs(awayScore - expAway);
}
