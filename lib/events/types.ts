export type EventStatus = "scheduled" | "live" | "final" | "postponed" | "cancelled";

export interface ProviderIds {
  espn?: string;
  oddsApi?: string;
}

export interface CanonicalEvent {
  id: string;
  sportKey: string;
  sportGroup: string | null;
  league: string | null;
  homeTeam: string;
  awayTeam: string;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  startsAt: string;
  status: EventStatus;
  providerIds: ProviderIds;
  completed: boolean;
  homeScore: number | null;
  awayScore: number | null;
}
