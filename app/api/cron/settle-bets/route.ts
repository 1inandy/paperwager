import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncScoresForSport } from "@/lib/odds/cache";
import { settleBet } from "@/lib/betting/settlement";
import { fetchScoresForSport, isOddsApiConfigured } from "@/lib/odds/client";
import { isOddsApiEnabled } from "@/lib/odds/provider";
import { shouldVoidEvent, SETTLEMENT_RULE_VERSION } from "@/lib/betting/rules";
import { teamsMatch } from "@/lib/betting/odds";
import {
  espnGameToScoreResult,
  syncModelScoresForSettlement,
} from "@/lib/model/sync";
import { authorizeCron } from "@/lib/cron/auth";
import { withCronLock } from "@/lib/cron/lock";
import type { EventOdds } from "@/lib/types";
import type { ScoreResult } from "@/lib/betting/settlement";
import type { EspnGame } from "@/lib/model/espn";

const SCORE_MATCH_WINDOW_MS = 6 * 60 * 60 * 1000;

type CachedSettlementEvent = {
  event_id: string;
  sport_key: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  odds: EventOdds | null;
};

type PendingSettlementBet = {
  event_id: string;
  sport_key: string;
  commence_time: string;
};

function getMarketOutcomesByEvent(
  events: { event_id: string; odds: EventOdds | null }[],
) {
  const outcomesByEvent = new Map<string, Map<string, string[]>>();

  for (const event of events) {
    const marketsByKey = new Map<string, string[]>();

    for (const bookmaker of event.odds?.bookmakers ?? []) {
      for (const market of bookmaker.markets ?? []) {
        if (!marketsByKey.has(market.key)) {
          marketsByKey.set(
            market.key,
            market.outcomes.map((outcome) => outcome.name),
          );
        }
      }
    }

    if (marketsByKey.size > 0) {
      outcomesByEvent.set(event.event_id, marketsByKey);
    }
  }

  return outcomesByEvent;
}

function getBetMarketOutcomes(
  bet: { event_id: string; market: string; market_outcomes?: unknown },
  outcomesByEvent: Map<string, Map<string, string[]>>,
) {
  if (Array.isArray(bet.market_outcomes) && bet.market_outcomes.length > 0) {
    return bet.market_outcomes.filter((outcome): outcome is string =>
      typeof outcome === "string",
    );
  }

  return outcomesByEvent.get(bet.event_id)?.get(bet.market) ?? null;
}

function formatEspnDate(value: string, offsetDays = 0) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function getScoreMatch(
  event: CachedSettlementEvent,
  game: EspnGame,
): { homeScore: number; awayScore: number } | null {
  if (!game.completed || game.homeScore == null || game.awayScore == null) {
    return null;
  }

  const eventTime = new Date(event.commence_time).getTime();
  const gameTime = new Date(game.commenceTime).getTime();
  if (
    Number.isNaN(eventTime) ||
    Number.isNaN(gameTime) ||
    Math.abs(eventTime - gameTime) > SCORE_MATCH_WINDOW_MS
  ) {
    return null;
  }

  const direct =
    teamsMatch(game.homeTeam, event.home_team) &&
    teamsMatch(game.awayTeam, event.away_team);

  if (direct) {
    return { homeScore: game.homeScore, awayScore: game.awayScore };
  }

  const swapped =
    teamsMatch(game.homeTeam, event.away_team) &&
    teamsMatch(game.awayTeam, event.home_team);

  if (swapped) {
    return { homeScore: game.awayScore, awayScore: game.homeScore };
  }

  return null;
}

function buildScoreResult(
  event: CachedSettlementEvent,
  scores: { homeScore: number; awayScore: number },
): ScoreResult {
  return {
    id: event.event_id,
    completed: true,
    home_team: event.home_team,
    away_team: event.away_team,
    scores: [
      { name: event.home_team, score: String(scores.homeScore) },
      { name: event.away_team, score: String(scores.awayScore) },
    ],
  };
}

async function syncEspnFallbackScoresForSettlement({
  admin,
  pendingBets,
  cachedEventsById,
  scoreMap,
}: {
  admin: ReturnType<typeof createAdminClient>;
  pendingBets: PendingSettlementBet[];
  cachedEventsById: Map<string, CachedSettlementEvent>;
  scoreMap: Map<string, ScoreResult>;
}) {
  const datesBySport = new Map<string, Set<string>>();

  for (const bet of pendingBets) {
    if (scoreMap.has(bet.event_id)) continue;

    const event = cachedEventsById.get(bet.event_id);
    const dateSource = event?.commence_time ?? bet.commence_time;
    const commenceTime = new Date(dateSource).getTime();
    if (Number.isNaN(commenceTime) || commenceTime > Date.now()) continue;

    const dateKeys = [
      formatEspnDate(dateSource, -1),
      formatEspnDate(dateSource),
      formatEspnDate(dateSource, 1),
    ].filter((date): date is string => Boolean(date));

    if (dateKeys.length === 0) continue;

    const dates = datesBySport.get(bet.sport_key) ?? new Set<string>();
    for (const dateKey of dateKeys) {
      dates.add(dateKey);
    }
    datesBySport.set(bet.sport_key, dates);
  }

  for (const [sportKey, dates] of datesBySport) {
    const games: EspnGame[] = [];

    for (const date of dates) {
      try {
        const syncedGames = await syncModelScoresForSettlement(sportKey, date);
        games.push(...syncedGames);
      } catch (err) {
        console.error(`ESPN fallback score sync failed for ${sportKey} ${date}:`, err);
      }
    }

    const completedGames = games.filter(
      (game) => game.completed && game.homeScore != null && game.awayScore != null,
    );

    for (const event of cachedEventsById.values()) {
      if (event.sport_key !== sportKey || scoreMap.has(event.event_id)) continue;

      for (const game of completedGames) {
        const scores = getScoreMatch(event, game);
        if (!scores) continue;

        scoreMap.set(event.event_id, buildScoreResult(event, scores));

        await admin
          .from("cached_events")
          .update({
            completed: true,
            status: "final",
            home_score: scores.homeScore,
            away_score: scores.awayScore,
            synced_at: new Date().toISOString(),
          })
          .eq("event_id", event.event_id);

        break;
      }
    }
  }
}

export async function settlePendingBets(scorecardId?: string) {
  const admin = createAdminClient();

  await admin
    .from("tournaments")
    .update({ status: "completed" })
    .eq("status", "active")
    .lt("ends_at", new Date().toISOString());

  let pendingBetsQuery = admin
    .from("bets")
    .select("*")
    .eq("status", "pending");

  if (scorecardId) {
    pendingBetsQuery = pendingBetsQuery.eq("scorecard_id", scorecardId);
  }

  const { data: pendingBets, error } = await pendingBetsQuery;

  if (error) throw new Error(error.message);
  if (!pendingBets || pendingBets.length === 0) {
    return { settled: 0, pending: 0 };
  }

  const sportKeys = [...new Set(pendingBets.map((b) => b.sport_key))];
  const eventIds = [...new Set(pendingBets.map((b) => b.event_id))];
  const scoreMap = new Map<string, ScoreResult>();

  const { data: cachedOddsRows } = await admin
    .from("cached_events")
    .select("event_id, sport_key, home_team, away_team, commence_time, odds")
    .in("event_id", eventIds);

  const cachedEvents = (cachedOddsRows ?? []) as CachedSettlementEvent[];
  const cachedEventsById = new Map(
    cachedEvents.map((event) => [event.event_id, event]),
  );
  const marketOutcomesByEvent = getMarketOutcomesByEvent(
    cachedEvents,
  );

  if (isOddsApiEnabled() && isOddsApiConfigured()) {
    for (const sportKey of sportKeys) {
      try {
        const scores = await fetchScoresForSport(sportKey);
        for (const score of scores) {
          scoreMap.set(score.id, score);
        }
        await syncScoresForSport(sportKey);
      } catch (err) {
        console.error(`Score sync failed for ${sportKey}:`, err);
      }
    }
  } else {
    for (const sportKey of sportKeys) {
      try {
        const games = await syncModelScoresForSettlement(sportKey);
        for (const game of games) {
          if (game.homeScore != null && game.awayScore != null) {
            scoreMap.set(game.id, espnGameToScoreResult(game));
          }
        }
      } catch (err) {
        console.error(`ESPN score sync failed for ${sportKey}:`, err);
      }
    }
  }

  await syncEspnFallbackScoresForSettlement({
    admin,
    pendingBets: pendingBets as PendingSettlementBet[],
    cachedEventsById,
    scoreMap,
  });

  const { data: cachedCompleted } = await admin
    .from("cached_events")
    .select("*")
    .eq("completed", true)
    .not("home_score", "is", null);

  for (const event of cachedCompleted ?? []) {
    if (scoreMap.has(event.event_id)) continue;
    if (shouldVoidEvent(event.status ?? "final")) continue;
    scoreMap.set(event.event_id, {
      id: event.event_id,
      completed: true,
      home_team: event.home_team,
      away_team: event.away_team,
      scores: [
        { name: event.home_team, score: String(event.home_score) },
        { name: event.away_team, score: String(event.away_score) },
      ],
    });
  }

  let settledCount = 0;

  for (const bet of pendingBets) {
    const { data: freshBet } = await admin
      .from("bets")
      .select("status")
      .eq("id", bet.id)
      .single();

    if (freshBet?.status !== "pending") continue;

    const score = scoreMap.get(bet.event_id);
    if (!score || !score.completed) continue;

    const result = settleBet(
      {
        ...bet,
        market_outcomes: getBetMarketOutcomes(bet, marketOutcomesByEvent),
      },
      score,
    );
    if (result.status === "pending") continue;

    let txType: string;
    let txAmount: number;
    let txDescription: string;
    let payout = 0;

    if (result.status === "won") {
      payout = result.payout;
      txType = "bet_won";
      txAmount = result.payout;
      txDescription = `Won: ${bet.selection}`;
    } else if (result.status === "push" || result.status === "void") {
      payout = result.payout;
      txType = result.status === "push" ? "bet_push" : "bet_void";
      txAmount = result.payout;
      txDescription = `${result.status}: ${bet.selection}`;
    } else {
      txType = "bet_lost";
      txAmount = 0;
      txDescription = `Lost: ${bet.selection}`;
    }

    const { data: settled, error: settleError } = await admin.rpc("settle_bet_atomic", {
      p_bet_id: bet.id,
      p_status: result.status,
      p_profit: result.profit,
      p_payout: payout,
      p_settlement_rule_version: SETTLEMENT_RULE_VERSION,
      p_transaction_type: txType,
      p_transaction_amount: txAmount,
      p_description: txDescription,
    });
    if (settleError) {
      throw new Error(`Unable to settle bet ${bet.id}: ${settleError.message}`);
    }
    if (settled) settledCount++;
  }

  return { settled: settledCount, pending: pendingBets.length - settledCount };
}

export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  const { skipped, result, error } = await withCronLock("settle-bets", settlePendingBets);

  if (skipped) {
    return NextResponse.json({ skipped: true, reason: "Job already running" });
  }
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const revalidated = (result?.settled ?? 0) > 0;
  if (revalidated) {
    revalidatePath("/app", "layout");
  }

  return NextResponse.json({
    provider: isOddsApiEnabled() ? "api" : "model",
    ...result,
    revalidated,
    syncedAt: new Date().toISOString(),
  });
}

export const dynamic = "force-dynamic";
