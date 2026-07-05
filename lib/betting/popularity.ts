import { createAdminClient } from "@/lib/supabase/admin";
import type { Actor } from "@/lib/types";

const BETS_PAGE_SIZE = 1_000;
const UNKNOWN_RANK = 10_000;

const SPORT_GROUP_POPULARITY = [
  "American Football",
  "Basketball",
  "Baseball",
  "Soccer",
  "Ice Hockey",
  "Tennis",
  "Mixed Martial Arts",
  "MMA",
  "Boxing",
  "Golf",
  "Cricket",
  "Rugby Union",
  "Rugby League",
  "Aussie Rules",
  "Lacrosse",
];

const SPORT_KEY_POPULARITY = [
  "americanfootball_nfl",
  "basketball_nba",
  "baseball_mlb",
  "americanfootball_ncaaf",
  "basketball_ncaab",
  "icehockey_nhl",
  "soccer_epl",
  "soccer_uefa_champs_league",
  "soccer_spain_la_liga",
  "soccer_germany_bundesliga",
  "soccer_italy_serie_a",
  "soccer_france_ligue_one",
  "soccer_usa_mls",
  "soccer_fifa_world_cup",
  "soccer_uefa_european_championship",
  "soccer_conmebol_copa_libertadores",
  "soccer_conmebol_copa_sudamericana",
  "mma_mixed_martial_arts",
  "boxing_boxing",
  "tennis_atp_us_open",
  "tennis_wta_us_open",
  "tennis_atp_wimbledon",
  "tennis_wta_wimbledon",
  "tennis_atp_french_open",
  "tennis_wta_french_open",
  "tennis_atp_aus_open_singles",
  "tennis_wta_aus_open_singles",
  "golf_masters_tournament_winner",
  "golf_pga_championship_winner",
  "golf_us_open_winner",
  "golf_the_open_championship_winner",
  "cricket_ipl",
  "rugbyleague_nrl",
  "rugbyunion_six_nations",
  "aussierules_afl",
];

const SPORT_GROUP_RANKS = new Map(
  SPORT_GROUP_POPULARITY.map((group, index) => [normalize(group), index]),
);

const SPORT_KEY_RANKS = new Map(
  SPORT_KEY_POPULARITY.map((key, index) => [key, index]),
);

type AdminClient = ReturnType<typeof createAdminClient>;

type BetSportRow = {
  sport_key: string | null;
};

type ScorecardIdRow = {
  id: string;
};

type PopularSport = {
  key: string;
  title: string;
};

type PopularityScore = {
  actorCount: number;
  globalCount: number;
  fallbackRank: number;
  name: string;
};

export interface BetPopularityCounts {
  globalBySportKey: Map<string, number>;
  actorBySportKey: Map<string, number>;
}

export function createEmptyBetPopularityCounts(): BetPopularityCounts {
  return {
    globalBySportKey: new Map(),
    actorBySportKey: new Map(),
  };
}

export async function getBetPopularityCounts(
  actor: Actor | null,
): Promise<BetPopularityCounts> {
  const admin = createAdminClient();
  const globalCountsPromise = getSportKeyBetCounts(admin);
  const actorScorecardIdsPromise = getActorScorecardIds(admin, actor);

  const [globalBySportKey, actorScorecardIds] = await Promise.all([
    globalCountsPromise,
    actorScorecardIdsPromise,
  ]);

  return {
    globalBySportKey,
    actorBySportKey: await getSportKeyBetCounts(admin, actorScorecardIds),
  };
}

export function sortSportGroupsByPopularity<TSport extends PopularSport>(
  entries: [string, TSport[]][],
  counts: BetPopularityCounts,
): [string, TSport[]][] {
  return entries
    .map(([group, sports]) => ({
      group,
      sports: sortSportsByPopularity(sports, counts),
      score: getGroupPopularityScore(group, sports, counts),
    }))
    .sort((a, b) => comparePopularityScores(a.score, b.score))
    .map(({ group, sports }) => [group, sports]);
}

export function sortSportsByPopularity<TSport extends PopularSport>(
  sports: TSport[],
  counts: BetPopularityCounts,
): TSport[] {
  return [...sports].sort((a, b) =>
    comparePopularityScores(
      getSportPopularityScore(a, counts),
      getSportPopularityScore(b, counts),
    ),
  );
}

function getGroupPopularityScore<TSport extends PopularSport>(
  group: string,
  sports: TSport[],
  counts: BetPopularityCounts,
): PopularityScore {
  return {
    actorCount: sumSportCounts(sports, counts.actorBySportKey),
    globalCount: sumSportCounts(sports, counts.globalBySportKey),
    fallbackRank: getSportGroupRank(group),
    name: group,
  };
}

function getSportPopularityScore<TSport extends PopularSport>(
  sport: TSport,
  counts: BetPopularityCounts,
): PopularityScore {
  return {
    actorCount: counts.actorBySportKey.get(sport.key) ?? 0,
    globalCount: counts.globalBySportKey.get(sport.key) ?? 0,
    fallbackRank: getSportKeyRank(sport.key),
    name: sport.title,
  };
}

function comparePopularityScores(a: PopularityScore, b: PopularityScore) {
  return (
    b.actorCount - a.actorCount ||
    b.globalCount - a.globalCount ||
    a.fallbackRank - b.fallbackRank ||
    a.name.localeCompare(b.name)
  );
}

function sumSportCounts<TSport extends PopularSport>(
  sports: TSport[],
  counts: Map<string, number>,
) {
  return sports.reduce((sum, sport) => sum + (counts.get(sport.key) ?? 0), 0);
}

function getSportGroupRank(group: string) {
  return SPORT_GROUP_RANKS.get(normalize(group)) ?? UNKNOWN_RANK;
}

function getSportKeyRank(key: string) {
  return SPORT_KEY_RANKS.get(key) ?? UNKNOWN_RANK;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function getActorScorecardIds(
  admin: AdminClient,
  actor: Actor | null,
): Promise<string[]> {
  if (!actor) return [];

  const query =
    actor.type === "user"
      ? admin.from("scorecards").select("id").eq("user_id", actor.userId ?? "")
      : admin
          .from("scorecards")
          .select("id")
          .eq("guest_session_id", actor.guestSessionId ?? "");

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as ScorecardIdRow[]).map((scorecard) => scorecard.id);
}

async function getSportKeyBetCounts(
  admin: AdminClient,
  scorecardIds?: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (scorecardIds && scorecardIds.length === 0) return counts;

  let from = 0;

  while (true) {
    const baseQuery = admin
      .from("bets")
      .select("sport_key")
      .order("id", { ascending: true })
      .range(from, from + BETS_PAGE_SIZE - 1);
    const query = scorecardIds ? baseQuery.in("scorecard_id", scorecardIds) : baseQuery;
    const { data, error } = await query;

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as BetSportRow[];
    for (const row of rows) {
      if (!row.sport_key) continue;
      counts.set(row.sport_key, (counts.get(row.sport_key) ?? 0) + 1);
    }

    if (rows.length < BETS_PAGE_SIZE) break;
    from += BETS_PAGE_SIZE;
  }

  return counts;
}
