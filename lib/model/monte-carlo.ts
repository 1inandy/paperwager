import type { EventOdds } from "@/lib/types";
import {
  applyVig,
  median,
  normalRandom,
  probabilityToAmerican,
  roundToHalf,
  STANDARD_JUICE,
} from "@/lib/model/math";
import type { SportModelConfig } from "@/lib/model/sport-config";

export interface TeamRatingInput {
  offensive_rating: number;
  defensive_rating: number;
  elo: number;
}

export interface SimulationResult {
  homeScore: number;
  awayScore: number;
}

export interface MonteCarloLines {
  homeWinProb: number;
  spread: number;
  total: number;
  homeMoneyline: number;
  awayMoneyline: number;
  simulations: number;
  avgHomeScore: number;
  avgAwayScore: number;
}

const DEFAULT_SIMULATIONS = 10_000;

export function expectedPoints(
  offense: number,
  opponentDefense: number,
  config: SportModelConfig,
  multiplier = 1,
): number {
  return config.leagueAvgPoints * (offense / 100) * (opponentDefense / 100) * multiplier;
}

export function simulateGame(
  home: TeamRatingInput,
  away: TeamRatingInput,
  config: SportModelConfig,
): SimulationResult {
  const homeExpected = expectedPoints(
    home.offensive_rating,
    away.defensive_rating,
    config,
    config.homeAdvantage,
  );
  const awayExpected = expectedPoints(
    away.offensive_rating,
    home.defensive_rating,
    config,
  );

  const homeScore = Math.max(0, Math.round(normalRandom(homeExpected, config.scoreStdDev)));
  const awayScore = Math.max(0, Math.round(normalRandom(awayExpected, config.scoreStdDev)));

  return { homeScore, awayScore };
}

export function runMonteCarlo(
  home: TeamRatingInput,
  away: TeamRatingInput,
  config: SportModelConfig,
  iterations = DEFAULT_SIMULATIONS,
): MonteCarloLines {
  const results: SimulationResult[] = [];

  for (let i = 0; i < iterations; i++) {
    results.push(simulateGame(home, away, config));
  }

  const homeWins = results.filter((r) => r.homeScore > r.awayScore).length;
  const draws = results.filter((r) => r.homeScore === r.awayScore).length;
  const homeWinProb = (homeWins + draws * 0.5) / iterations;

  const margins = results.map((r) => r.homeScore - r.awayScore);
  const totals = results.map((r) => r.homeScore + r.awayScore);

  const fairHomeProb = applyVig(homeWinProb);
  const fairAwayProb = applyVig(1 - homeWinProb);

  const avgHomeScore = results.reduce((s, r) => s + r.homeScore, 0) / iterations;
  const avgAwayScore = results.reduce((s, r) => s + r.awayScore, 0) / iterations;

  return {
    homeWinProb,
    spread: roundToHalf(median(margins)),
    total: roundToHalf(median(totals)),
    homeMoneyline: probabilityToAmerican(fairHomeProb),
    awayMoneyline: probabilityToAmerican(fairAwayProb),
    simulations: iterations,
    avgHomeScore,
    avgAwayScore,
  };
}

export function monteCarloToEventOdds(
  lines: MonteCarloLines,
  homeTeam: string,
  awayTeam: string,
): EventOdds {
  return {
    bookmakers: [
      {
        key: "paperwager_model",
        title: "PaperWager Model",
        markets: [
          {
            key: "h2h",
            outcomes: [
              { name: homeTeam, price: lines.homeMoneyline },
              { name: awayTeam, price: lines.awayMoneyline },
            ],
          },
          {
            key: "spreads",
            outcomes: [
              { name: homeTeam, price: STANDARD_JUICE, point: lines.spread },
              { name: awayTeam, price: STANDARD_JUICE, point: -lines.spread },
            ],
          },
          {
            key: "totals",
            outcomes: [
              { name: "Over", price: STANDARD_JUICE, point: lines.total },
              { name: "Under", price: STANDARD_JUICE, point: lines.total },
            ],
          },
        ],
      },
    ],
  };
}
