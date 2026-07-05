/** Map The Odds API sport keys to ESPN API paths for logo lookups. */
export const ODDS_KEY_TO_ESPN_PATH: Record<string, string> = {
  basketball_nba: "basketball/nba",
  basketball_wnba: "basketball/wnba",
  basketball_ncaab: "basketball/mens-college-basketball",
  americanfootball_nfl: "football/nfl",
  americanfootball_nfl_preseason: "football/nfl",
  americanfootball_ncaaf: "football/college-football",
  americanfootball_cfl: "football/cfl",
  icehockey_nhl: "hockey/nhl",
  baseball_mlb: "baseball/mlb",
  soccer_epl: "soccer/eng.1",
  soccer_spain_la_liga: "soccer/esp.1",
  soccer_germany_bundesliga: "soccer/ger.1",
  soccer_italy_serie_a: "soccer/ita.1",
  soccer_france_ligue_one: "soccer/fra.1",
  soccer_usa_mls: "soccer/usa.1",
  soccer_uefa_champs_league: "soccer/uefa.champions",
  soccer_efl_champ: "soccer/eng.2",
  soccer_england_league1: "soccer/eng.3",
  soccer_england_league2: "soccer/eng.4",
  soccer_england_efl_cup: "soccer/eng.league_cup",
  soccer_fa_cup: "soccer/eng.fa",
  soccer_germany_dfb_pokal: "soccer/ger.dfb_pokal",
  soccer_brazil_campeonato: "soccer/bra.1",
  soccer_brazil_serie_b: "soccer/bra.2",
  soccer_fifa_world_cup: "soccer/fifa.world",
  soccer_uefa_european_championship: "soccer/uefa.euro",
  soccer_conmebol_copa_libertadores: "soccer/conmebol.libertadores",
  soccer_conmebol_copa_sudamericana: "soccer/conmebol.sudamericana",
  soccer_china_superleague: "soccer/chn.1",
  soccer_league_of_ireland: "soccer/irl.1",
  soccer_norway_eliteserien: "soccer/nor.1",
  soccer_sweden_allsvenskan: "soccer/swe.1",
  soccer_netherlands_eredivisie: "soccer/ned.1",
  soccer_portugal_primeira_liga: "soccer/por.1",
  soccer_scotland_premiership: "soccer/sco.1",
  soccer_mexico_ligamx: "soccer/mex.1",
  soccer_australia_aleague: "soccer/aus.1",
  soccer_japan_j_league: "soccer/jpn.1",
  soccer_belgium_first_div: "soccer/bel.1",
  soccer_turkey_super_league: "soccer/tur.1",
  soccer_greece_super_league: "soccer/gre.1",
  soccer_argentina_primera_division: "soccer/arg.1",
  aussierules_afl: "australian-football/afl",
  rugbyleague_nrl: "rugby-league/3",
  rugbyleague_nrl_state_of_origin: "rugby-league/3",
  mma_mixed_martial_arts: "mma/ufc",
  boxing_boxing: "boxing/boxing",
};

const SOCCER_KEY_OVERRIDES: Record<string, string> = {
  epl: "eng.1",
  efl_champ: "eng.2",
  england_league1: "eng.3",
  england_league2: "eng.4",
  england_efl_cup: "eng.league_cup",
  fa_cup: "eng.fa",
  spain_la_liga: "esp.1",
  germany_bundesliga: "ger.1",
  germany_dfb_pokal: "ger.dfb_pokal",
  italy_serie_a: "ita.1",
  france_ligue_one: "fra.1",
  usa_mls: "usa.1",
  uefa_champs_league: "uefa.champions",
  uefa_european_championship: "uefa.euro",
  fifa_world_cup: "fifa.world",
  brazil_campeonato: "bra.1",
  brazil_serie_b: "bra.2",
  conmebol_copa_libertadores: "conmebol.libertadores",
  conmebol_copa_sudamericana: "conmebol.sudamericana",
  china_superleague: "chn.1",
  league_of_ireland: "irl.1",
  norway_eliteserien: "nor.1",
  sweden_allsvenskan: "swe.1",
  finland_veikkausliiga: "fin.1",
  korea_kleague1: "kor.1",
};

export function getEspnPathForSportKey(sportKey: string): string | null {
  if (ODDS_KEY_TO_ESPN_PATH[sportKey]) return ODDS_KEY_TO_ESPN_PATH[sportKey];

  if (sportKey.startsWith("soccer_")) {
    const tail = sportKey.slice("soccer_".length);
    if (SOCCER_KEY_OVERRIDES[tail]) return `soccer/${SOCCER_KEY_OVERRIDES[tail]}`;
    return `soccer/${tail.replace(/_/g, ".")}`;
  }

  return null;
}
