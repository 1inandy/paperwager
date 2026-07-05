import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOddsConfigured } from "@/lib/odds/provider";
import { FEATURED_SPORTS } from "@/lib/constants";
import { formatAmericanOdds, teamsMatch } from "@/lib/betting/odds";
import { attachLogosToEvents } from "@/lib/teams/attach-logos";
import type { CachedEvent, EventOdds } from "@/lib/types";
import {
  SAMPLE_FEED,
  type FeaturedMatch,
  type HeroSlip,
  type LandingFeed,
  type TickerItem,
} from "./content";

// How long a built feed is served before we re-query Supabase. The Odds API
// itself is only ever called by the sync-market-odds cron (every 10 min), so
// this purely bounds database reads — page traffic never triggers an API call.
const FEED_REVALIDATE_SECONDS = 300;

// Keep a small upcoming queue so the hero board can advance locally as games
// start, without polling Supabase for every turnover.
const HERO_MATCH_LIMIT = 12;

const kickoffFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
  timeZoneName: "short",
});

type FeedRow = Pick<
  CachedEvent,
  | "event_id"
  | "sport_key"
  | "commence_time"
  | "home_team"
  | "away_team"
  | "home_logo_url"
  | "away_logo_url"
  | "home_team_abbr"
  | "away_team_abbr"
  | "odds"
  | "synced_at"
>;

function leagueLabel(sportKey: string): string {
  const known = FEATURED_SPORTS.find((s) => s.key === sportKey);
  if (known) return known.label;
  // Fall back to the most specific token, e.g. "soccer_epl" -> "EPL".
  const tail = sportKey.split("_").pop() ?? sportKey;
  return tail.length <= 4 ? tail.toUpperCase() : tail.replace(/\b\w/g, (c) => c.toUpperCase());
}

const CODE_IGNORE = new Set(["the", "of", "fc", "sc", "afc", "cf"]);

/** Derive a short 2–3 char badge code from a team or competitor name. */
function shortCode(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "—";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  const significant = words.filter((w) => !CODE_IGNORE.has(w.toLowerCase()));
  const source = significant.length ? significant : words;
  return source.map((w) => w[0]).join("").slice(0, 3).toUpperCase();
}

function primaryBookmaker(odds: EventOdds) {
  return odds?.bookmakers?.[0] ?? null;
}

/** Home-team moneyline (American) from the first bookmaker, if present. */
function homeMoneyline(odds: EventOdds, homeTeam: string): number | null {
  const market = primaryBookmaker(odds)?.markets.find((m) => m.key === "h2h");
  if (!market) return null;
  const outcome = market.outcomes.find((o) => teamsMatch(o.name, homeTeam));
  return outcome ? outcome.price : null;
}

/** A compact total/spread label for the tile footer. */
function totalLabel(odds: EventOdds): string {
  const bk = primaryBookmaker(odds);
  if (!bk) return "—";
  const over = bk.markets
    .find((m) => m.key === "totals")
    ?.outcomes.find((o) => /over/i.test(o.name));
  if (over?.point != null) return `O ${over.point}`;
  const homeSpread = bk.markets.find((m) => m.key === "spreads")?.outcomes[0];
  if (homeSpread?.point != null) {
    return `${homeSpread.point > 0 ? "+" : ""}${homeSpread.point}`;
  }
  return "—";
}

function toFeaturedMatch(row: FeedRow): FeaturedMatch {
  const ml = homeMoneyline(row.odds, row.home_team);
  const startsAt = row.commence_time;
  return {
    league: leagueLabel(row.sport_key),
    startsAt,
    startsLabel: kickoffFormatter.format(new Date(startsAt)),
    home: {
      code: row.home_team_abbr ?? shortCode(row.home_team),
      name: row.home_team,
      logoUrl: row.home_logo_url,
    },
    away: {
      code: row.away_team_abbr ?? shortCode(row.away_team),
      name: row.away_team,
      logoUrl: row.away_logo_url,
    },
    market: "Moneyline",
    line: ml != null ? formatAmericanOdds(ml) : "—",
    total: totalLabel(row.odds),
    live: new Date(startsAt).getTime() <= Date.now(),
  };
}

async function buildFeed(): Promise<LandingFeed> {
  if (!isOddsConfigured()) return SAMPLE_FEED;

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("cached_events")
    .select("event_id, sport_key, commence_time, home_team, away_team, odds, synced_at")
    .eq("completed", false)
    .gte("commence_time", now)
    .order("commence_time", { ascending: true })
    .limit(60);

  if (error || !data || data.length === 0) return SAMPLE_FEED;

  const rows = await attachLogosToEvents(data as FeedRow[]);
  // Only matches that actually carry a usable moneyline.
  const priced = rows.filter((r) => homeMoneyline(r.odds, r.home_team) != null);
  if (priced.length === 0) return SAMPLE_FEED;

  // The board renders three at a time, but receives a deeper upcoming queue so
  // it can rotate through starts locally before asking the server for more.
  const chosen = priced.slice(0, HERO_MATCH_LIMIT);

  const matches = chosen.map(toFeaturedMatch);

  const ticker: TickerItem[] = priced.slice(0, 10).map((row) => {
    const ml = homeMoneyline(row.odds, row.home_team)!;
    return {
      match: `${leagueLabel(row.sport_key)} · ${shortCode(row.away_team)} / ${shortCode(row.home_team)}`,
      line: formatAmericanOdds(ml),
      up: ml > 0,
      startsLabel: kickoffFormatter.format(new Date(row.commence_time)),
    };
  });

  const top = matches[0];
  const topMl = homeMoneyline(chosen[0].odds, chosen[0].home_team)!;
  const stake = 50;
  // Profit on a winning $50 stake at the home moneyline.
  const profit =
    topMl > 0 ? (stake * topMl) / 100 : (stake * 100) / Math.abs(topMl);
  const slip: HeroSlip = {
    league: top.league,
    pick: top.home.name,
    pickLogoUrl: top.home.logoUrl,
    pickAbbr: top.home.code,
    market: "Moneyline",
    line: top.line,
    stake,
    toWin: Math.round(profit),
  };

  // This powers the prominent freshness label on the landing board. It
  // represents when the cached landing feed was checked, not the oldest/newest
  // provider sync timestamp among individual events.
  const updatedAt = new Date().toISOString();

  return { source: "live", updatedAt, matches, ticker, slip };
}

const cachedFeed = unstable_cache(
  async (): Promise<LandingFeed> => {
    try {
      return await buildFeed();
    } catch {
      return SAMPLE_FEED;
    }
  },
  ["landing-feed-v3"],
  { revalidate: FEED_REVALIDATE_SECONDS, tags: ["landing-feed"] },
);

/** Cached landing feed — bounded DB reads, never triggers an Odds API call. */
export async function getLandingFeed(): Promise<LandingFeed> {
  try {
    return await cachedFeed();
  } catch {
    return SAMPLE_FEED;
  }
}
