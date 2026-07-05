import type { CachedEvent } from "@/lib/types";
import { fetchEspnRoster, lookupTeamLogo } from "@/lib/teams/logos";
import { normalizeTeamNameForLogo } from "@/lib/teams/normalize";

type EventWithTeams = Pick<
  CachedEvent,
  | "sport_key"
  | "home_team"
  | "away_team"
  | "home_logo_url"
  | "away_logo_url"
  | "home_team_abbr"
  | "away_team_abbr"
>;

type LogoResult = { logoUrl: string | null; abbreviation: string | null };

const logoMemo = new Map<string, Promise<LogoResult>>();

function memoKey(sportKey: string, teamName: string) {
  return `${sportKey}:${normalizeTeamNameForLogo(teamName)}`;
}

async function getTeamLogo(sportKey: string, teamName: string): Promise<LogoResult> {
  const key = memoKey(sportKey, teamName);
  if (!logoMemo.has(key)) {
    logoMemo.set(
      key,
      lookupTeamLogo(sportKey, teamName).then((info) => ({
        logoUrl: info.logoUrl,
        abbreviation: info.abbreviation,
      })),
    );
  }
  return logoMemo.get(key)!;
}

function needsLogos(event: EventWithTeams): boolean {
  return !event.home_logo_url || !event.away_logo_url;
}

/** Attach ESPN logos in-memory when DB columns are empty or missing. */
export async function attachLogosToEvent<T extends EventWithTeams>(
  event: T,
): Promise<T> {
  if (!needsLogos(event)) return event;

  const [home, away] = await Promise.all([
    event.home_logo_url
      ? Promise.resolve({
          logoUrl: event.home_logo_url,
          abbreviation: event.home_team_abbr ?? null,
        })
      : getTeamLogo(event.sport_key, event.home_team),
    event.away_logo_url
      ? Promise.resolve({
          logoUrl: event.away_logo_url,
          abbreviation: event.away_team_abbr ?? null,
        })
      : getTeamLogo(event.sport_key, event.away_team),
  ]);

  return {
    ...event,
    home_logo_url: event.home_logo_url ?? home.logoUrl ?? null,
    away_logo_url: event.away_logo_url ?? away.logoUrl ?? null,
    home_team_abbr: event.home_team_abbr ?? home.abbreviation ?? null,
    away_team_abbr: event.away_team_abbr ?? away.abbreviation ?? null,
  };
}

export async function attachLogosToEvents<T extends EventWithTeams>(
  events: T[],
): Promise<T[]> {
  if (events.length === 0) return events;

  const sportKeys = [...new Set(events.filter(needsLogos).map((e) => e.sport_key))];
  await Promise.all(sportKeys.map((sportKey) => fetchEspnRoster(sportKey)));

  return Promise.all(events.map((event) => attachLogosToEvent(event)));
}
