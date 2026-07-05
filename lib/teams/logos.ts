import { createAdminClient } from "@/lib/supabase/admin";
import { getEspnPathForSportKey } from "@/lib/teams/espn-paths";
import {
  normalizeTeamNameForLogo,
  teamNameVariants,
  tokenOverlapScore,
} from "@/lib/teams/normalize";

export interface TeamLogoInfo {
  name: string;
  logoUrl: string | null;
  abbreviation: string | null;
}

interface EspnTeamPayload {
  displayName?: string;
  shortDisplayName?: string;
  abbreviation?: string;
  location?: string;
  name?: string;
  nickname?: string;
  logo?: string;
  logos?: { href: string }[];
}

interface EspnSearchItem {
  displayName?: string;
  abbreviation?: string;
  logos?: { href: string }[];
  image?: string;
  type?: string;
}

const rosterCache = new Map<string, { roster: TeamLogoInfo[]; index: Map<string, TeamLogoInfo> }>();
const searchCache = new Map<string, TeamLogoInfo | null>();

function pickLogoUrl(team: EspnTeamPayload | EspnSearchItem): string | null {
  if ("logo" in team && team.logo) return team.logo;
  const logos = team.logos;
  if (logos?.length) return logos[0].href;
  if ("image" in team && team.image) return team.image;
  return null;
}

function toTeamInfo(team: EspnTeamPayload, fallbackName: string): TeamLogoInfo {
  return {
    name: team.displayName ?? fallbackName,
    logoUrl: pickLogoUrl(team),
    abbreviation: team.abbreviation ?? team.shortDisplayName ?? null,
  };
}

function addRosterEntry(
  roster: TeamLogoInfo[],
  index: Map<string, TeamLogoInfo>,
  team: EspnTeamPayload,
) {
  const info = toTeamInfo(team, team.displayName ?? "");
  if (!info.logoUrl) return;

  roster.push(info);

  const fields = [
    team.displayName,
    team.shortDisplayName,
    team.name,
    team.location,
    team.nickname,
    team.abbreviation,
  ];

  for (const field of fields) {
    if (!field) continue;
    for (const variant of teamNameVariants(field)) {
      if (!index.has(variant)) index.set(variant, info);
    }
  }
}

function findInRoster(
  roster: TeamLogoInfo[],
  index: Map<string, TeamLogoInfo>,
  teamName: string,
): TeamLogoInfo | null {
  for (const variant of teamNameVariants(teamName)) {
    const hit = index.get(variant);
    if (hit) return hit;
  }

  let best: TeamLogoInfo | null = null;
  let bestScore = 0.55;

  for (const team of roster) {
    const score = Math.max(
      tokenOverlapScore(teamName, team.name),
      team.abbreviation ? tokenOverlapScore(teamName, team.abbreviation) : 0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = team;
    }
  }

  return best;
}

export async function fetchEspnRoster(sportKey: string): Promise<{
  roster: TeamLogoInfo[];
  index: Map<string, TeamLogoInfo>;
}> {
  const cached = rosterCache.get(sportKey);
  if (cached) return cached;

  const espnPath = getEspnPathForSportKey(sportKey);
  const roster: TeamLogoInfo[] = [];
  const index = new Map<string, TeamLogoInfo>();
  if (!espnPath) return { roster, index };

  try {
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/${espnPath}/teams`,
      { next: { revalidate: 86400 } },
    );
    if (!response.ok) return { roster, index };

    const data = (await response.json()) as {
      sports?: {
        leagues?: {
          teams?: { team?: EspnTeamPayload }[];
        }[];
      }[];
    };

    for (const league of data.sports?.[0]?.leagues ?? []) {
      for (const entry of league.teams ?? []) {
        if (entry.team) addRosterEntry(roster, index, entry.team);
      }
    }

    const payload = { roster, index };
    rosterCache.set(sportKey, payload);
    return payload;
  } catch (err) {
    console.error(`Roster fetch failed for ${sportKey}:`, err);
  }

  return { roster, index };
}

/** @deprecated Use fetchEspnRoster — kept for compatibility. */
export async function fetchEspnLogoMap(sportKey: string): Promise<Map<string, TeamLogoInfo>> {
  const { roster, index } = await fetchEspnRoster(sportKey);
  if (index.size > 0) return index;

  const map = new Map<string, TeamLogoInfo>();
  for (const team of roster) {
    map.set(normalizeTeamNameForLogo(team.name), team);
  }
  return map;
}

async function searchEspnTeam(teamName: string): Promise<TeamLogoInfo | null> {
  const cacheKey = normalizeTeamNameForLogo(teamName);
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey) ?? null;

  try {
    const response = await fetch(
      `https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(teamName)}&limit=8`,
      { next: { revalidate: 86400 } },
    );
    if (!response.ok) {
      searchCache.set(cacheKey, null);
      return null;
    }

    const data = (await response.json()) as { items?: EspnSearchItem[] };
    const items = (data.items ?? []).filter((item) => item.type === "team");

    let best: EspnSearchItem | null = null;
    let bestScore = 0.45;

    for (const item of items) {
      if (!item.displayName) continue;
      const score = tokenOverlapScore(teamName, item.displayName);
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }

    const result = best
      ? {
          name: best.displayName!,
          logoUrl: pickLogoUrl(best),
          abbreviation: best.abbreviation ?? null,
        }
      : null;

    searchCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error(`Logo search failed for ${teamName}:`, err);
    searchCache.set(cacheKey, null);
    return null;
  }
}

export async function lookupTeamLogo(
  sportKey: string,
  teamName: string,
): Promise<TeamLogoInfo> {
  const { roster, index } = await fetchEspnRoster(sportKey);
  const rosterHit = findInRoster(roster, index, teamName);
  if (rosterHit) {
    return { name: teamName, logoUrl: rosterHit.logoUrl, abbreviation: rosterHit.abbreviation };
  }

  const searchHit = await searchEspnTeam(teamName);
  if (searchHit?.logoUrl) {
    return { name: teamName, logoUrl: searchHit.logoUrl, abbreviation: searchHit.abbreviation };
  }

  return { name: teamName, logoUrl: null, abbreviation: searchHit?.abbreviation ?? null };
}

export async function resolveTeamLogo(
  sportKey: string,
  teamName: string,
): Promise<TeamLogoInfo> {
  const admin = createAdminClient();

  const { data: alias } = await admin
    .from("team_aliases")
    .select("team_id, teams(logo_url, abbreviation, canonical_name)")
    .eq("sport_key", sportKey)
    .ilike("alias", teamName.trim())
    .maybeSingle();

  const teamRow = alias?.teams as {
    logo_url?: string;
    abbreviation?: string;
    canonical_name?: string;
  } | null;

  if (teamRow?.logo_url) {
    return {
      name: teamName,
      logoUrl: teamRow.logo_url,
      abbreviation: teamRow.abbreviation ?? null,
    };
  }

  const resolved = await lookupTeamLogo(sportKey, teamName);

  if (resolved.logoUrl && alias?.team_id) {
    await admin
      .from("teams")
      .update({
        logo_url: resolved.logoUrl,
        abbreviation: resolved.abbreviation,
      })
      .eq("id", alias.team_id);
  }

  return {
    name: teamName,
    logoUrl: resolved.logoUrl,
    abbreviation: resolved.abbreviation ?? teamRow?.abbreviation ?? null,
  };
}

export async function enrichEventLogos(
  sportKey: string,
  homeTeam: string,
  awayTeam: string,
) {
  const [home, away] = await Promise.all([
    resolveTeamLogo(sportKey, homeTeam),
    resolveTeamLogo(sportKey, awayTeam),
  ]);

  return {
    home_logo_url: home.logoUrl,
    away_logo_url: away.logoUrl,
    home_team_abbr: home.abbreviation,
    away_team_abbr: away.abbreviation,
  };
}

/** True if a selection string refers to a team (not Over/Under/Draw). */
export function isTeamSelection(name: string, homeTeam: string, awayTeam: string): boolean {
  const n = normalizeTeamNameForLogo(name);
  return (
    n === normalizeTeamNameForLogo(homeTeam) ||
    n === normalizeTeamNameForLogo(awayTeam) ||
    normalizeTeamNameForLogo(homeTeam).includes(n) ||
    normalizeTeamNameForLogo(awayTeam).includes(n)
  );
}

export function logoForSelection(
  selection: string,
  homeTeam: string,
  awayTeam: string,
  homeLogo?: string | null,
  awayLogo?: string | null,
): string | null {
  if (
    normalizeTeamNameForLogo(selection) === normalizeTeamNameForLogo(homeTeam) ||
    normalizeTeamNameForLogo(homeTeam).includes(normalizeTeamNameForLogo(selection))
  ) {
    return homeLogo ?? null;
  }
  if (
    normalizeTeamNameForLogo(selection) === normalizeTeamNameForLogo(awayTeam) ||
    normalizeTeamNameForLogo(awayTeam).includes(normalizeTeamNameForLogo(selection))
  ) {
    return awayLogo ?? null;
  }
  return null;
}
