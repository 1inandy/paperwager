import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTeamId } from "@/lib/teams/resolver";
import { enrichEventLogos } from "@/lib/teams/logos";
import {
  fetchOddsForSport,
  fetchSports,
  normalizeEventOdds,
  type OddsApiEvent,
  type OddsApiSport,
} from "@/lib/odds/client";
import { getPreferredBookmaker } from "@/lib/odds/provider";
import { SYNC_SPORT_KEYS } from "@/lib/constants";
import type { EventOdds } from "@/lib/types";

let logoColumnsAvailable: boolean | null = null;

async function hasLogoColumns(admin: ReturnType<typeof createAdminClient>) {
  if (logoColumnsAvailable !== null) return logoColumnsAvailable;
  const { error } = await admin
    .from("cached_events")
    .select("home_logo_url")
    .limit(0);
  logoColumnsAvailable = !error;
  return logoColumnsAvailable;
}

function isEventMarketSport(sport: OddsApiSport) {
  return sport.active && !sport.has_outrights;
}

function getConfiguredSyncSportKeys() {
  return process.env.ODDS_SYNC_SPORT_KEYS?.split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

function getDefaultSyncSportKeys(sports: OddsApiSport[]) {
  const configuredKeys = getConfiguredSyncSportKeys();
  if (configuredKeys?.length) return configuredKeys;

  const activeEventSports = sports.filter(isEventMarketSport).map((s) => s.key);
  return activeEventSports.length > 0 ? activeEventSports : [...SYNC_SPORT_KEYS];
}

function pickBookmaker(event: OddsApiEvent) {
  const preferred = getPreferredBookmaker();
  return (
    event.bookmakers.find((b) => b.key === preferred) ??
    event.bookmakers[0] ??
    null
  );
}

function toMarketOdds(event: OddsApiEvent): EventOdds {
  const bookmaker = pickBookmaker(event);
  if (!bookmaker) return { bookmakers: [] };
  return {
    bookmakers: [
      {
        key: bookmaker.key,
        title: bookmaker.title,
        markets: bookmaker.markets.map((m) => ({
          key: m.key as "h2h" | "spreads" | "totals",
          outcomes: m.outcomes.map((o) => ({
            name: o.name,
            price: o.price,
            point: o.point,
          })),
        })),
      },
    ],
  };
}

export async function syncMarketSportsList(sports?: OddsApiSport[]) {
  const admin = createAdminClient();
  const catalog = sports ?? (await fetchSports());
  const syncedAt = new Date().toISOString();

  const rows = catalog
    .map((s) => ({
      key: s.key,
      title: s.title,
      description: s.description,
      sport_group: s.group,
      active: isEventMarketSport(s),
      synced_at: syncedAt,
    }));

  const { error } = await admin.from("cached_sports").upsert(rows, { onConflict: "key" });
  if (error) throw new Error(error.message);
  return rows.filter((row) => row.active).length;
}

export async function syncMarketOddsForSports(
  sportKeys?: string[],
  sports?: OddsApiSport[],
) {
  const admin = createAdminClient();
  let totalEvents = 0;
  const catalog = sports ?? (await fetchSports());
  const keysToSync = sportKeys ?? getDefaultSyncSportKeys(catalog);
  const sportMeta = new Map(catalog.map((s) => [s.key, s]));
  const storeLogos = await hasLogoColumns(admin);

  for (const sportKey of keysToSync) {
    try {
      const events = await fetchOddsForSport(sportKey);
      const meta = sportMeta.get(sportKey);

      for (const event of events) {
        const odds = toMarketOdds(event);
        const bookmaker = pickBookmaker(event);

        const homeTeamId = await resolveTeamId(
          sportKey,
          event.home_team,
          "odds_api",
        );
        const awayTeamId = await resolveTeamId(
          sportKey,
          event.away_team,
          "odds_api",
        );

        const logos = storeLogos
          ? await enrichEventLogos(sportKey, event.home_team, event.away_team)
          : null;

        const row = {
          event_id: event.id,
          sport_key: sportKey,
          sport_group: meta?.group ?? null,
          league: meta?.title ?? sportKey,
          commence_time: event.commence_time,
          home_team: event.home_team,
          away_team: event.away_team,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          ...(logos ?? {}),
          odds,
          market_bookmaker: bookmaker?.title ?? null,
          provider_ids: { oddsApi: event.id },
          synced_at: new Date().toISOString(),
        };

        const { error } = await admin.from("cached_events").upsert(row, {
          onConflict: "event_id",
        });
        if (error) throw new Error(error.message);
        totalEvents++;
      }
    } catch (err) {
      console.error(`Market odds sync failed for ${sportKey}:`, err);
    }
  }

  return totalEvents;
}

export async function getSportsByGroup() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cached_sports")
    .select("*")
    .eq("active", true)
    .order("sport_group")
    .order("title");
  if (error) throw new Error(error.message);

  const grouped = new Map<string, typeof data>();
  for (const sport of data ?? []) {
    const group = sport.sport_group ?? "Other";
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(sport);
  }
  return grouped;
}

export async function syncMarketOddsForSport(sportKey: string) {
  return syncMarketOddsForSports([sportKey]);
}

/** Full market sync: sports catalog + odds for active event-based sports. */
export async function syncAllMarketOdds() {
  const sports = await fetchSports();
  const sportsCount = await syncMarketSportsList(sports);
  const eventsCount = await syncMarketOddsForSports(
    getDefaultSyncSportKeys(sports),
    sports,
  );
  return { sportsCount, eventsCount };
}

export { normalizeEventOdds, toMarketOdds };
