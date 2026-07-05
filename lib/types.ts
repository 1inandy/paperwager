export type BetStatus = "pending" | "won" | "lost" | "push" | "void";
export type MarketType = "h2h" | "spreads" | "totals";
export type TournamentStatus = "draft" | "active" | "completed";
export type TransactionType =
  | "bet_placed"
  | "bet_won"
  | "bet_lost"
  | "bet_push"
  | "bet_void"
  | "tournament_reset"
  | "scorecard_created";

export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
}

export interface GuestSession {
  id: string;
  token_hash: string;
  expires_at: string;
  migrated_to: string | null;
  created_at: string;
}

export interface Scorecard {
  id: string;
  user_id: string | null;
  guest_session_id: string | null;
  name: string;
  balance: number;
  starting_balance: number;
  is_default: boolean;
  tournament_id: string | null;
  created_at: string;
}

export interface CachedSport {
  key: string;
  title: string;
  description: string | null;
  sport_group?: string | null;
  active: boolean;
  synced_at: string;
}

export interface CachedEvent {
  event_id: string;
  sport_key: string;
  sport_group?: string | null;
  league?: string | null;
  commence_time: string;
  home_team: string;
  away_team: string;
  odds: EventOdds;
  model_odds?: EventOdds | null;
  market_bookmaker?: string | null;
  completed: boolean;
  home_score: number | null;
  away_score: number | null;
  home_logo_url?: string | null;
  away_logo_url?: string | null;
  home_team_abbr?: string | null;
  away_team_abbr?: string | null;
  status?: string;
  synced_at: string;
}

export interface OutcomeOdds {
  name: string;
  price: number;
  point?: number;
}

export interface MarketOdds {
  key: MarketType;
  outcomes: OutcomeOdds[];
}

export interface BookmakerOdds {
  key: string;
  title: string;
  markets: MarketOdds[];
}

export interface EventOdds {
  bookmakers: BookmakerOdds[];
}

export interface Bet {
  id: string;
  scorecard_id: string;
  event_id: string;
  sport_key: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  market: MarketType;
  selection: string;
  line: number | null;
  odds_decimal: number;
  odds_american: number;
  stake: number;
  potential_payout: number;
  status: BetStatus;
  settled_at: string | null;
  profit: number | null;
  odds_provider?: "api" | "model";
  bookmaker?: string | null;
  odds_captured_at?: string | null;
  commence_time_at_bet?: string | null;
  settlement_rule_version?: string;
  market_outcomes?: string[] | null;
  created_at: string;
}

export interface BalanceTransaction {
  id: string;
  scorecard_id: string;
  bet_id: string | null;
  amount: number;
  type: TransactionType;
  description: string | null;
  created_at: string;
}

export interface Tournament {
  id: string;
  creator_id: string;
  name: string;
  starting_balance: number;
  starts_at: string;
  ends_at: string;
  invite_code: string;
  status: TournamentStatus;
  created_at: string;
}

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  user_id: string;
  scorecard_id: string;
  joined_at: string;
  profiles?: Profile;
  scorecards?: Scorecard;
}

export interface BetSelection {
  eventId: string;
  sportKey: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  market: MarketType;
  selection: string;
  line: number | null;
  oddsAmerican: number;
  oddsDecimal: number;
  oddsProvider: "api" | "model";
  bookmaker: string;
  oddsCapturedAt: string;
  marketOutcomeNames?: string[];
  homeLogoUrl?: string | null;
  awayLogoUrl?: string | null;
  homeTeamAbbr?: string | null;
  awayTeamAbbr?: string | null;
}

export interface Actor {
  type: "user" | "guest";
  userId?: string;
  guestSessionId?: string;
}
