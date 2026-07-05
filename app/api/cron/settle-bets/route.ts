import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncScoresForSport } from "@/lib/odds/cache";
import { settleBet } from "@/lib/betting/settlement";
import { fetchScoresForSport, isOddsApiConfigured } from "@/lib/odds/client";
import { isOddsApiEnabled } from "@/lib/odds/provider";
import { shouldVoidEvent, SETTLEMENT_RULE_VERSION } from "@/lib/betting/rules";
import {
  espnGameToScoreResult,
  syncModelScoresForSettlement,
} from "@/lib/model/sync";
import { authorizeCron } from "@/lib/cron/auth";
import { withCronLock } from "@/lib/cron/lock";
import type { BetStatus, EventOdds } from "@/lib/types";
import type { ScoreResult } from "@/lib/betting/settlement";

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

async function settlePendingBets() {
  const admin = createAdminClient();

  const { data: pendingBets, error } = await admin
    .from("bets")
    .select("*")
    .eq("status", "pending");

  if (error) throw new Error(error.message);
  if (!pendingBets || pendingBets.length === 0) {
    return { settled: 0, pending: 0 };
  }

  const sportKeys = [...new Set(pendingBets.map((b) => b.sport_key))];
  const eventIds = [...new Set(pendingBets.map((b) => b.event_id))];
  const scoreMap = new Map<string, ScoreResult>();

  const { data: cachedOddsRows } = await admin
    .from("cached_events")
    .select("event_id, odds")
    .in("event_id", eventIds);

  const marketOutcomesByEvent = getMarketOutcomesByEvent(
    (cachedOddsRows ?? []) as { event_id: string; odds: EventOdds | null }[],
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

    const { data: scorecard } = await admin
      .from("scorecards")
      .select("balance")
      .eq("id", bet.scorecard_id)
      .single();

    if (!scorecard) continue;

    let newBalance = Number(scorecard.balance);
    let txType: string;
    let txAmount: number;
    let txDescription: string;

    if (result.status === "won") {
      newBalance += result.payout;
      txType = "bet_won";
      txAmount = result.payout;
      txDescription = `Won: ${bet.selection}`;
    } else if (result.status === "push" || result.status === "void") {
      newBalance += result.payout;
      txType = result.status === "push" ? "bet_push" : "bet_void";
      txAmount = result.payout;
      txDescription = `${result.status}: ${bet.selection}`;
    } else {
      txType = "bet_lost";
      txAmount = 0;
      txDescription = `Lost: ${bet.selection}`;
    }

    await admin
      .from("bets")
      .update({
        status: result.status as BetStatus,
        settled_at: new Date().toISOString(),
        profit: result.profit,
        settlement_rule_version: SETTLEMENT_RULE_VERSION,
      })
      .eq("id", bet.id)
      .eq("status", "pending");

    if (result.status === "won" || result.status === "push" || result.status === "void") {
      await admin
        .from("scorecards")
        .update({ balance: newBalance })
        .eq("id", bet.scorecard_id);

      const { error: txError } = await admin.from("balance_transactions").insert({
        scorecard_id: bet.scorecard_id,
        bet_id: bet.id,
        amount: txAmount,
        type: txType,
        description: txDescription,
      });

      if (txError?.code === "23505") continue;
    } else {
      const { error: txError } = await admin.from("balance_transactions").insert({
        scorecard_id: bet.scorecard_id,
        bet_id: bet.id,
        amount: -Number(bet.stake),
        type: txType,
        description: txDescription,
      });
      if (txError?.code === "23505") continue;
    }

    settledCount++;
  }

  await admin
    .from("tournaments")
    .update({ status: "completed" })
    .eq("status", "active")
    .lt("ends_at", new Date().toISOString());

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
