import { getSportConfig } from "@/lib/model/sport-config";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

export interface EspnGame {
  id: string;
  sportKey: string;
  commenceTime: string;
  homeTeam: string;
  awayTeam: string;
  completed: boolean;
  homeScore: number | null;
  awayScore: number | null;
}

interface EspnScoreboardResponse {
  events?: {
    id: string;
    date: string;
    competitions?: {
      competitors?: {
        homeAway: string;
        score?: string;
        team?: { displayName?: string };
      }[];
      status?: { type?: { completed?: boolean; state?: string } };
    }[];
  }[];
}

function parseEspnEvent(event: NonNullable<EspnScoreboardResponse["events"]>[0], sportKey: string): EspnGame | null {
  const competition = event.competitions?.[0];
  if (!competition?.competitors?.length) return null;

  const home = competition.competitors.find((c) => c.homeAway === "home");
  const away = competition.competitors.find((c) => c.homeAway === "away");
  if (!home?.team?.displayName || !away?.team?.displayName) return null;

  const completed =
    competition.status?.type?.completed === true ||
    competition.status?.type?.state === "post";

  const homeScore = home.score != null ? parseInt(home.score, 10) : null;
  const awayScore = away.score != null ? parseInt(away.score, 10) : null;

  return {
    id: `espn_${sportKey}_${event.id}`,
    sportKey,
    commenceTime: event.date,
    homeTeam: home.team.displayName,
    awayTeam: away.team.displayName,
    completed,
    homeScore: Number.isNaN(homeScore!) ? null : homeScore,
    awayScore: Number.isNaN(awayScore!) ? null : awayScore,
  };
}

export async function fetchEspnScoreboard(
  sportKey: string,
  dates?: string,
): Promise<EspnGame[]> {
  const config = getSportConfig(sportKey);
  if (!config) return [];

  const url = dates
    ? `${ESPN_BASE}/${config.espnPath}/scoreboard?dates=${dates}`
    : `${ESPN_BASE}/${config.espnPath}/scoreboard`;

  const response = await fetch(url, {
    next: { revalidate: 0 },
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`ESPN API error ${response.status} for ${sportKey}`);
  }

  const data = (await response.json()) as EspnScoreboardResponse;
  const games: EspnGame[] = [];

  for (const event of data.events ?? []) {
    const parsed = parseEspnEvent(event, sportKey);
    if (parsed) games.push(parsed);
  }

  return games;
}

/** Fetch scoreboards for the last N days (for training). */
export async function fetchEspnHistoricalGames(
  sportKey: string,
  daysBack = 30,
): Promise<EspnGame[]> {
  const games: EspnGame[] = [];
  const seen = new Set<string>();

  for (let i = 1; i <= daysBack; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");

    try {
      const dayGames = await fetchEspnScoreboard(sportKey, dateStr);
      for (const game of dayGames) {
        if (game.completed && !seen.has(game.id)) {
          seen.add(game.id);
          games.push(game);
        }
      }
    } catch (err) {
      console.error(`ESPN historical fetch failed for ${sportKey} ${dateStr}:`, err);
    }
  }

  return games;
}

export function isEspnSupported(sportKey: string): boolean {
  return getSportConfig(sportKey) != null;
}
