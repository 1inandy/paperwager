import type { Bet, BetStatus, MarketType } from "@/lib/types";
import { teamsMatch } from "@/lib/betting/odds";

export interface ScoreResult {
  id: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores?: { name: string; score: string }[];
}

function getTeamScore(
  scores: { name: string; score: string }[] | undefined,
  teamName: string,
): number | null {
  if (!scores) return null;
  const match = scores.find((s) => teamsMatch(s.name, teamName));
  if (!match) return null;
  const parsed = parseInt(match.score, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function settleBet(
  bet: Pick<
    Bet,
    | "market"
    | "selection"
    | "line"
    | "stake"
    | "odds_decimal"
    | "potential_payout"
    | "home_team"
    | "away_team"
    | "market_outcomes"
  >,
  score: ScoreResult,
): { status: BetStatus; profit: number; payout: number } {
  if (!score.completed) {
    return { status: "pending", profit: 0, payout: 0 };
  }

  const homeScore = getTeamScore(score.scores, bet.home_team);
  const awayScore = getTeamScore(score.scores, bet.away_team);

  if (homeScore === null || awayScore === null) {
    return { status: "void", profit: 0, payout: bet.stake };
  }

  switch (bet.market as MarketType) {
    case "h2h":
      return settleH2h(bet, homeScore, awayScore);
    case "spreads":
      return settleSpread(bet, homeScore, awayScore);
    case "totals":
      return settleTotal(bet, homeScore, awayScore);
    default:
      return { status: "void", profit: 0, payout: bet.stake };
  }
}

function isDrawOutcome(selection: string): boolean {
  const normalized = selection.trim().toLowerCase();
  return normalized === "draw" || normalized === "tie";
}

function marketHasDrawOutcome(outcomes: string[] | null | undefined): boolean {
  return outcomes?.some(isDrawOutcome) ?? false;
}

function settleH2h(
  bet: Pick<
    Bet,
    "selection" | "stake" | "potential_payout" | "home_team" | "away_team" | "market_outcomes"
  >,
  homeScore: number,
  awayScore: number,
): { status: BetStatus; profit: number; payout: number } {
  const selectionIsDraw = isDrawOutcome(bet.selection);

  if (homeScore === awayScore) {
    if (selectionIsDraw) {
      const profit = bet.potential_payout - bet.stake;
      return { status: "won", profit, payout: bet.potential_payout };
    }

    if (marketHasDrawOutcome(bet.market_outcomes)) {
      return { status: "lost", profit: -bet.stake, payout: 0 };
    }

    return { status: "push", profit: 0, payout: bet.stake };
  }

  if (selectionIsDraw) {
    return { status: "lost", profit: -bet.stake, payout: 0 };
  }

  const winner =
    homeScore > awayScore ? bet.home_team : bet.away_team;

  if (teamsMatch(bet.selection, winner)) {
    const profit = bet.potential_payout - bet.stake;
    return { status: "won", profit, payout: bet.potential_payout };
  }

  return { status: "lost", profit: -bet.stake, payout: 0 };
}

function settleSpread(
  bet: Pick<Bet, "selection" | "line" | "stake" | "potential_payout" | "home_team" | "away_team">,
  homeScore: number,
  awayScore: number,
): { status: BetStatus; profit: number; payout: number } {
  const line = bet.line ?? 0;
  let adjustedDiff: number;

  if (teamsMatch(bet.selection, bet.home_team)) {
    adjustedDiff = homeScore + line - awayScore;
  } else if (teamsMatch(bet.selection, bet.away_team)) {
    adjustedDiff = awayScore + line - homeScore;
  } else {
    return { status: "void", profit: 0, payout: bet.stake };
  }

  if (adjustedDiff === 0) {
    return { status: "push", profit: 0, payout: bet.stake };
  }

  if (adjustedDiff > 0) {
    const profit = bet.potential_payout - bet.stake;
    return { status: "won", profit, payout: bet.potential_payout };
  }

  return { status: "lost", profit: -bet.stake, payout: 0 };
}

function settleTotal(
  bet: Pick<Bet, "selection" | "line" | "stake" | "potential_payout">,
  homeScore: number,
  awayScore: number,
): { status: BetStatus; profit: number; payout: number } {
  const total = homeScore + awayScore;
  const line = bet.line ?? 0;
  const selection = bet.selection.toLowerCase();

  if (selection === "over") {
    if (total === line) return { status: "push", profit: 0, payout: bet.stake };
    if (total > line) {
      const profit = bet.potential_payout - bet.stake;
      return { status: "won", profit, payout: bet.potential_payout };
    }
    return { status: "lost", profit: -bet.stake, payout: 0 };
  }

  if (selection === "under") {
    if (total === line) return { status: "push", profit: 0, payout: bet.stake };
    if (total < line) {
      const profit = bet.potential_payout - bet.stake;
      return { status: "won", profit, payout: bet.potential_payout };
    }
    return { status: "lost", profit: -bet.stake, payout: 0 };
  }

  return { status: "void", profit: 0, payout: bet.stake };
}
