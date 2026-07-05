export const STARTING_BALANCE = 10_000;
export const GUEST_SESSION_DAYS = 30;
export const GUEST_COOKIE_NAME = "paperwager_guest";

/** Fallback sports if the provider catalog cannot be used for sync discovery. */
export const SYNC_SPORT_KEYS = [
  "basketball_nba",
  "americanfootball_nfl",
  "icehockey_nhl",
  "baseball_mlb",
  "soccer_fifa_world_cup",
  "soccer_epl",
  "mma_mixed_martial_arts",
] as const;

export const FEATURED_SPORTS = [
  { key: "basketball_nba", label: "NBA" },
  { key: "americanfootball_nfl", label: "NFL" },
  { key: "icehockey_nhl", label: "NHL" },
  { key: "baseball_mlb", label: "MLB" },
  { key: "soccer_fifa_world_cup", label: "World Cup" },
  { key: "soccer_epl", label: "Premier League" },
  { key: "soccer_uefa_champs_league", label: "Champions League" },
  { key: "americanfootball_ncaaf", label: "NCAAF" },
  { key: "basketball_ncaab", label: "NCAAB" },
  { key: "mma_mixed_martial_arts", label: "UFC" },
  { key: "boxing_boxing", label: "Boxing" },
  { key: "cricket_ipl", label: "Cricket" },
  { key: "tennis_atp_french_open", label: "Tennis" },
  { key: "rugbyunion_six_nations", label: "Rugby" },
  { key: "aussierules_afl", label: "AFL" },
] as const;
