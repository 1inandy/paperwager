import { tokenOverlapScore } from "@/lib/teams/normalize";

/** Known Odds API keys → ESPN league logo URLs. */
const LEAGUE_LOGO_BY_KEY: Record<string, string> = {
  basketball_nba: "https://a.espncdn.com/i/teamlogos/leagues/500/nba.png",
  basketball_wnba: "https://a.espncdn.com/i/teamlogos/leagues/500/wnba.png",
  basketball_ncaab: "https://a.espncdn.com/redesign/assets/img/icons/ESPN-icon-basketball.png",
  americanfootball_nfl: "https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png",
  americanfootball_nfl_preseason: "https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png",
  americanfootball_ncaaf: "https://a.espncdn.com/redesign/assets/img/icons/ESPN-icon-football.png",
  americanfootball_cfl: "https://a.espncdn.com/redesign/assets/img/icons/ESPN-icon-football.png",
  icehockey_nhl: "https://a.espncdn.com/i/teamlogos/leagues/500/nhl.png",
  baseball_mlb: "https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png",
  soccer_epl: "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png",
  soccer_spain_la_liga: "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png",
  soccer_germany_bundesliga: "https://a.espncdn.com/i/leaguelogos/soccer/500/82.png",
  soccer_italy_serie_a: "https://a.espncdn.com/i/leaguelogos/soccer/500/12.png",
  soccer_france_ligue_one: "https://a.espncdn.com/i/leaguelogos/soccer/500/24.png",
  soccer_usa_mls: "https://a.espncdn.com/i/leaguelogos/soccer/500/19.png",
  soccer_uefa_champs_league: "https://a.espncdn.com/i/leaguelogos/soccer/500/2.png",
  soccer_efl_champ: "https://a.espncdn.com/i/leaguelogos/soccer/500/48.png",
  soccer_england_league1: "https://a.espncdn.com/i/leaguelogos/soccer/500/84.png",
  soccer_england_league2: "https://a.espncdn.com/i/leaguelogos/soccer/500/85.png",
  soccer_england_efl_cup: "https://a.espncdn.com/i/leaguelogos/soccer/500/86.png",
  soccer_fa_cup: "https://a.espncdn.com/i/leaguelogos/soccer/500/86.png",
  soccer_germany_dfb_pokal: "https://a.espncdn.com/i/leaguelogos/soccer/500/2061.png",
  soccer_fifa_world_cup: "https://a.espncdn.com/i/leaguelogos/soccer/500/4.png",
  soccer_uefa_european_championship: "https://a.espncdn.com/i/leaguelogos/soccer/500/3.png",
  soccer_conmebol_copa_libertadores: "https://a.espncdn.com/i/leaguelogos/soccer/500/58.png",
  soccer_conmebol_copa_sudamericana: "https://a.espncdn.com/i/leaguelogos/soccer/500/59.png",
  mma_mixed_martial_arts: "https://a.espncdn.com/i/teamlogos/leagues/500/ufc.png",
  boxing_boxing: "https://a.espncdn.com/redesign/assets/img/icons/ESPN-icon-boxing.png",
  tennis_atp_wimbledon: "https://a.espncdn.com/redesign/assets/img/icons/ESPN-icon-tennis.png",
  tennis_wta_wimbledon: "https://a.espncdn.com/redesign/assets/img/icons/ESPN-icon-tennis.png",
  cricket_ipl: "https://a.espncdn.com/redesign/assets/img/icons/ESPN-icon-cricket.png",
  cricket_t20_blast: "https://a.espncdn.com/redesign/assets/img/icons/ESPN-icon-cricket.png",
  aussierules_afl: "https://a.espncdn.com/redesign/assets/img/icons/ESPN-icon-rugby.png",
  rugbyleague_nrl: "https://a.espncdn.com/redesign/assets/img/icons/ESPN-icon-rugby.png",
};

interface EspnSearchItem {
  displayName?: string;
  type?: string;
  logos?: { href: string }[];
  image?: string;
}

const searchCache = new Map<string, string | null>();

function pickLogo(item: EspnSearchItem): string | null {
  if (item.logos?.[0]?.href) return item.logos[0].href;
  if (item.image) return item.image;
  return null;
}

async function searchLeagueLogo(query: string): Promise<string | null> {
  const cacheKey = query.trim().toLowerCase();
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey) ?? null;

  try {
    const response = await fetch(
      `https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(query)}&limit=10`,
      { next: { revalidate: 86400 } },
    );
    if (!response.ok) {
      searchCache.set(cacheKey, null);
      return null;
    }

    const data = (await response.json()) as { items?: EspnSearchItem[] };
    const leagues = (data.items ?? []).filter((item) => item.type === "league");

    let best: EspnSearchItem | null = null;
    let bestScore = 0.4;

    for (const league of leagues) {
      if (!league.displayName) continue;
      const score = tokenOverlapScore(query, league.displayName);
      if (score > bestScore && pickLogo(league)) {
        bestScore = score;
        best = league;
      }
    }

    const url = best ? pickLogo(best) : null;
    searchCache.set(cacheKey, url);
    return url;
  } catch {
    searchCache.set(cacheKey, null);
    return null;
  }
}

export async function getLeagueLogoUrl(
  sportKey: string,
  title?: string | null,
): Promise<string | null> {
  const sync = getLeagueLogoUrlSync(sportKey);
  if (sync) return sync;

  if (title) {
    const fromTitle = await searchLeagueLogo(title);
    if (fromTitle) return fromTitle;
  }

  const fromKey = sportKey
    .replace(/^[a-z]+_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return searchLeagueLogo(fromKey);
}

/** Fast path for components that cannot await (falls back to sport icon). */
export function getLeagueLogoUrlSync(sportKey: string): string | null {
  return LEAGUE_LOGO_BY_KEY[sportKey] ?? null;
}

export async function resolveLeagueLogos<
  T extends { key: string; title: string },
>(leagues: T[]): Promise<(T & { logoUrl: string | null })[]> {
  const memo = new Map<string, Promise<string | null>>();

  return Promise.all(
    leagues.map(async (league) => {
      if (!memo.has(league.key)) {
        memo.set(league.key, getLeagueLogoUrl(league.key, league.title));
      }
      return {
        ...league,
        logoUrl: await memo.get(league.key)!,
      };
    }),
  );
}
