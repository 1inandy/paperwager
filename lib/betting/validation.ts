import type { BetSelection } from "@/lib/types";
import { calculatePayout } from "@/lib/betting/odds";
import { SETTLEMENT_RULE_VERSION } from "@/lib/betting/rules";
import { getMarketOddsProvider } from "@/lib/odds/provider";

export interface PlaceBetInput {
  selection: BetSelection;
  stake: number;
  balance: number;
}

export function validateBet(input: PlaceBetInput): string | null {
  const { selection, stake, balance } = input;

  if (stake <= 0) return "Stake must be greater than zero";
  if (stake > balance) return "Insufficient balance";
  if (selection.oddsDecimal <= 1) return "Invalid odds";

  const commenceTime = new Date(selection.commenceTime);
  if (commenceTime.getTime() <= Date.now()) {
    return "Event has already started — betting is locked";
  }

  if (getMarketOddsProvider() === "api" && selection.oddsProvider === "model") {
    return "Paper bets use market lines only. Model lines are for comparison.";
  }

  if (getMarketOddsProvider() === "model" && selection.oddsProvider !== "model") {
    return "Invalid odds source for model-only mode.";
  }

  return null;
}

export function buildBetRecord(
  scorecardId: string,
  selection: BetSelection,
  stake: number,
) {
  const potentialPayout = calculatePayout(stake, selection.oddsDecimal);
  const now = new Date().toISOString();

  return {
    scorecard_id: scorecardId,
    event_id: selection.eventId,
    sport_key: selection.sportKey,
    home_team: selection.homeTeam,
    away_team: selection.awayTeam,
    commence_time: selection.commenceTime,
    commence_time_at_bet: selection.commenceTime,
    market: selection.market,
    selection: selection.selection,
    line: selection.line,
    odds_decimal: selection.oddsDecimal,
    odds_american: selection.oddsAmerican,
    stake,
    potential_payout: potentialPayout,
    odds_provider: selection.oddsProvider,
    bookmaker: selection.bookmaker,
    odds_captured_at: selection.oddsCapturedAt || now,
    settlement_rule_version: SETTLEMENT_RULE_VERSION,
    market_outcomes: selection.marketOutcomeNames?.length
      ? selection.marketOutcomeNames
      : null,
    status: "pending" as const,
  };
}
