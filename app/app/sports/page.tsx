import { SportCarousel } from "@/components/sport-carousel";
import { getActor } from "@/lib/auth/actor";
import {
  createEmptyBetPopularityCounts,
  getBetPopularityCounts,
  sortSportGroupsByPopularity,
} from "@/lib/betting/popularity";
import { getSportsByGroup } from "@/lib/odds/market-sync";
import { isOddsApiEnabled, isModelOddsEnabled } from "@/lib/odds/provider";
import { getSportGroupIconUrl } from "@/lib/teams/sport-logos";

function slugify(group: string) {
  return encodeURIComponent(group.toLowerCase().replace(/\s+/g, "-"));
}

interface SportsHomePageProps {
  searchParams: Promise<{ cardSet?: string }>;
}

export default async function SportsHomePage({
  searchParams,
}: SportsHomePageProps) {
  const { cardSet } = await searchParams;
  let groups: Awaited<ReturnType<typeof getSportsByGroup>> | null = null;

  if (isOddsApiEnabled()) {
    try {
      groups = await getSportsByGroup();
    } catch {
      // DB not ready
    }
  }

  let sportEntries: [string, { key: string; title: string }[]][] = [];

  if (groups && groups.size > 0) {
    let popularity = createEmptyBetPopularityCounts();

    try {
      const actor = await getActor();
      popularity = await getBetPopularityCounts(actor);
    } catch {
      // Popularity is a ranking hint; the catalog should still render without it.
    }

    sportEntries = sortSportGroupsByPopularity([...groups.entries()], popularity);
  }

  return (
    <div>
      <div className="mb-8">
        <p className="eyebrow mb-2">Sportsbook</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Pick your sport
        </h1>
        <p className="mt-2 max-w-prose text-sm text-muted">
          Browse leagues and place paper bets against real market lines.
        </p>
      </div>

      {cardSet && (
        <div className="card mb-6 border-success/30 bg-success/10 text-sm text-success">
          Card set to {cardSet}
        </div>
      )}

      {!isOddsApiEnabled() && (
        <div className="card mb-6 border-accent/30 bg-accent/5 text-sm">
          {isModelOddsEnabled() ? (
            <>
              <strong>Market odds unavailable.</strong> Add{" "}
              <code className="text-primary">ODDS_API_KEY</code> for real bookmaker
              lines. Model-only mode is a fallback, not the primary experience.
            </>
          ) : (
            <>Configure Supabase and sync odds to get started.</>
          )}
        </div>
      )}

      {sportEntries.length > 0 ? (
        <SportCarousel
          items={sportEntries.map(([group, leagues]) => ({
            group,
            href: `/app/category/${slugify(group)}`,
            leagueCount: leagues.length,
            logoUrl: getSportGroupIconUrl(group),
          }))}
        />
      ) : (
        <div className="card text-sm text-muted">
          No sports catalog yet. Run{" "}
          <code className="text-primary">/api/cron/sync-market-odds</code> after
          adding your Odds API key.
        </div>
      )}
    </div>
  );
}
