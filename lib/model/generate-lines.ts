import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamRating } from "@/lib/model/ratings";
import {
  monteCarloToEventOdds,
  runMonteCarlo,
} from "@/lib/model/monte-carlo";
import { fetchEspnScoreboard, type EspnGame } from "@/lib/model/espn";
import { getSportConfig, MODEL_SPORT_KEYS } from "@/lib/model/sport-config";
import { isModelComparisonEnabled } from "@/lib/odds/provider";
import { enrichEventLogos } from "@/lib/teams/logos";
import type { EventOdds } from "@/lib/types";

/** Generate model comparison lines for cached events — does NOT overwrite market odds. */
export async function generateModelLinesForSport(sportKey: string): Promise<number> {
  if (!isModelComparisonEnabled()) return 0;

  const config = getSportConfig(sportKey);
  if (!config) return 0;

  const admin = createAdminClient();
  const games = await fetchEspnScoreboard(sportKey);
  const upcoming = games.filter((g) => !g.completed);
  let count = 0;

  for (const game of upcoming) {
    const modelOdds = await buildModelOdds(game, config);

    const { data: matched } = await admin
      .from("cached_events")
      .select("event_id, odds")
      .eq("sport_key", sportKey)
      .eq("home_team", game.homeTeam)
      .eq("away_team", game.awayTeam)
      .gte("commence_time", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (matched) {
      const logos = await enrichEventLogos(
        sportKey,
        game.homeTeam,
        game.awayTeam,
      );
      const { error } = await admin
        .from("cached_events")
        .update({ model_odds: modelOdds, ...logos, synced_at: new Date().toISOString() })
        .eq("event_id", matched.event_id);
      if (!error) count++;
    } else {
      const logos = await enrichEventLogos(sportKey, game.homeTeam, game.awayTeam);
      const { error } = await admin.from("cached_events").upsert(
        {
          event_id: game.id,
          sport_key: sportKey,
          commence_time: game.commenceTime,
          home_team: game.homeTeam,
          away_team: game.awayTeam,
          odds: modelOdds,
          model_odds: modelOdds,
          ...logos,
          provider_ids: { espn: game.id },
          synced_at: new Date().toISOString(),
        },
        { onConflict: "event_id" },
      );
      if (!error) count++;
    }
  }

  return count;
}

async function buildModelOdds(
  game: EspnGame,
  config: NonNullable<ReturnType<typeof getSportConfig>>,
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

  return monteCarloToEventOdds(lines, game.homeTeam, game.awayTeam);
}

export async function generateAllModelLines(): Promise<number> {
  let total = 0;
  for (const key of MODEL_SPORT_KEYS) {
    try {
      total += await generateModelLinesForSport(key);
    } catch (err) {
      console.error(`Model line generation failed for ${key}:`, err);
    }
  }
  return total;
}

export async function getModelComparisonForEvent(
  event: {
    home_team: string;
    away_team: string;
    sport_key: string;
    odds: EventOdds;
    model_odds?: EventOdds | null;
  },
): Promise<{ spreadEdge: number | null; totalEdge: number | null; modelSpread: number | null; marketSpread: number | null } | null> {
  const modelOdds = event.model_odds as EventOdds | null | undefined;
  if (!modelOdds?.bookmakers?.[0]) return null;

  const modelBook = modelOdds.bookmakers[0];
  const marketBook = event.odds?.bookmakers?.[0];

  const modelSpread = modelBook.markets.find((m) => m.key === "spreads")?.outcomes
    .find((o) => o.name === event.home_team)?.point ?? null;
  const marketSpread = marketBook?.markets.find((m) => m.key === "spreads")?.outcomes
    .find((o) => o.name === event.home_team)?.point ?? null;

  const modelTotal = modelBook.markets.find((m) => m.key === "totals")?.outcomes
    .find((o) => o.name === "Over")?.point ?? null;
  const marketTotal = marketBook?.markets.find((m) => m.key === "totals")?.outcomes
    .find((o) => o.name === "Over")?.point ?? null;

  return {
    modelSpread,
    marketSpread,
    spreadEdge:
      modelSpread != null && marketSpread != null
        ? Math.round((modelSpread - marketSpread) * 10) / 10
        : null,
    totalEdge:
      modelTotal != null && marketTotal != null
        ? Math.round((modelTotal - marketTotal) * 10) / 10
        : null,
  };
}

export { trainAllSports, trainModelForSport } from "@/lib/model/sync";
