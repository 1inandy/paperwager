export interface SportModelConfig {
  key: string;
  label: string;
  espnPath: string;
  leagueAvgPoints: number;
  scoreStdDev: number;
  homeAdvantage: number;
  /** Elo K-factor for training updates */
  eloK: number;
  /** Learning rate for offensive/defensive rating EMA */
  learningRate: number;
}

export const SPORT_MODEL_CONFIGS: Record<string, SportModelConfig> = {
  basketball_nba: {
    key: "basketball_nba",
    label: "NBA",
    espnPath: "basketball/nba",
    leagueAvgPoints: 114,
    scoreStdDev: 12,
    homeAdvantage: 1.035,
    eloK: 20,
    learningRate: 0.08,
  },
  americanfootball_nfl: {
    key: "americanfootball_nfl",
    label: "NFL",
    espnPath: "football/nfl",
    leagueAvgPoints: 22.5,
    scoreStdDev: 10,
    homeAdvantage: 1.025,
    eloK: 24,
    learningRate: 0.1,
  },
  icehockey_nhl: {
    key: "icehockey_nhl",
    label: "NHL",
    espnPath: "hockey/nhl",
    leagueAvgPoints: 3.05,
    scoreStdDev: 1.4,
    homeAdvantage: 1.04,
    eloK: 16,
    learningRate: 0.12,
  },
  baseball_mlb: {
    key: "baseball_mlb",
    label: "MLB",
    espnPath: "baseball/mlb",
    leagueAvgPoints: 4.5,
    scoreStdDev: 2.2,
    homeAdvantage: 1.02,
    eloK: 12,
    learningRate: 0.06,
  },
  soccer_epl: {
    key: "soccer_epl",
    label: "Premier League",
    espnPath: "soccer/eng.1",
    leagueAvgPoints: 1.35,
    scoreStdDev: 1.1,
    homeAdvantage: 1.08,
    eloK: 20,
    learningRate: 0.1,
  },
};

export const MODEL_SPORT_KEYS = Object.keys(SPORT_MODEL_CONFIGS);

export function getSportConfig(sportKey: string): SportModelConfig | null {
  return SPORT_MODEL_CONFIGS[sportKey] ?? null;
}
