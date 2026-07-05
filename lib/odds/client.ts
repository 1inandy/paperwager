import { createAdminClient } from "@/lib/supabase/admin";
import type { EventOdds } from "@/lib/types";

const BASE_URL = "https://api.the-odds-api.com/v4";

export interface OddsApiSport {
  key: string;
  group: string;
  title: string;
  description: string;
  active: boolean;
  has_outrights: boolean;
}

export interface OddsApiEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: {
    key: string;
    title: string;
    markets: {
      key: string;
      outcomes: { name: string; price: number; point?: number }[];
    }[];
  }[];
}

export interface OddsApiScore {
  id: string;
  sport_key: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores?: { name: string; score: string }[];
  last_update?: string;
}

function getApiKey() {
  const key = process.env.ODDS_API_KEY;
  if (!key) throw new Error("ODDS_API_KEY is not set");
  return key;
}

async function logQuota(endpoint: string, response: Response) {
  const remaining = response.headers.get("x-requests-remaining");
  if (!remaining) return;

  try {
    const admin = createAdminClient();
    await admin.from("api_quota_log").insert({
      endpoint,
      credits_remaining: parseInt(remaining, 10),
    });
  } catch {
    // Non-fatal if logging fails
  }
}

async function fetchOddsApi<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}${path.includes("?") ? "&" : "?"}apiKey=${getApiKey()}`;
  const response = await fetch(url, { next: { revalidate: 0 } });

  await logQuota(path.split("?")[0], response);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Odds API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchSports(): Promise<OddsApiSport[]> {
  return fetchOddsApi<OddsApiSport[]>("/sports");
}

export async function fetchOddsForSport(sportKey: string): Promise<OddsApiEvent[]> {
  return fetchOddsApi<OddsApiEvent[]>(
    `/sports/${sportKey}/odds?regions=us&markets=h2h,spreads,totals&oddsFormat=american`,
  );
}

export async function fetchScoresForSport(
  sportKey: string,
  daysFrom = 3,
): Promise<OddsApiScore[]> {
  return fetchOddsApi<OddsApiScore[]>(
    `/sports/${sportKey}/scores?daysFrom=${daysFrom}`,
  );
}

export function normalizeEventOdds(event: OddsApiEvent): EventOdds {
  return {
    bookmakers: event.bookmakers.map((b) => ({
      key: b.key,
      title: b.title,
      markets: b.markets.map((m) => ({
        key: m.key as "h2h" | "spreads" | "totals",
        outcomes: m.outcomes.map((o) => ({
          name: o.name,
          price: o.price,
          point: o.point,
        })),
      })),
    })),
  };
}

/** Pick best odds from first bookmaker with the requested market. */
export function getBestMarketOdds(event: OddsApiEvent, marketKey: string) {
  for (const bookmaker of event.bookmakers) {
    const market = bookmaker.markets.find((m) => m.key === marketKey);
    if (market) {
      return {
        bookmaker: bookmaker.title,
        outcomes: market.outcomes,
      };
    }
  }
  return null;
}

export function isOddsApiConfigured(): boolean {
  return Boolean(process.env.ODDS_API_KEY);
}
