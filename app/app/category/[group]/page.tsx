import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { LeagueLogo, SportGroupLogo } from "@/components/entity-logo";
import { getActor } from "@/lib/auth/actor";
import {
  createEmptyBetPopularityCounts,
  getBetPopularityCounts,
  sortSportsByPopularity,
} from "@/lib/betting/popularity";
import { getSportsByGroup } from "@/lib/odds/market-sync";
import { isOddsApiEnabled } from "@/lib/odds/provider";
import { resolveLeagueLogos } from "@/lib/teams/league-logos";
import { getSportGroupIconUrl } from "@/lib/teams/sport-logos";
import { createAdminClient } from "@/lib/supabase/admin";
import { isVisibleMarketEvent } from "@/lib/events/status";

function slugify(group: string) {
  return group.toLowerCase().replace(/\s+/g, "-");
}

interface CategoryPageProps {
  params: Promise<{ group: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { group: groupSlug } = await params;

  if (!isOddsApiEnabled()) notFound();

  let groups: Awaited<ReturnType<typeof getSportsByGroup>>;
  try {
    groups = await getSportsByGroup();
  } catch {
    notFound();
  }

  const entry = [...groups.entries()].find(
    ([name]) => slugify(name) === decodeURIComponent(groupSlug),
  );

  if (!entry) notFound();

  const [groupName, leagues] = entry;
  let popularity = createEmptyBetPopularityCounts();

  try {
    const actor = await getActor();
    popularity = await getBetPopularityCounts(actor);
  } catch {
    // Popularity should improve ranking, not block browsing if unavailable.
  }

  const sortedLeagues = sortSportsByPopularity(leagues, popularity);
  const leaguesWithLogos = await resolveLeagueLogos(sortedLeagues);
  const groupLogoUrl = getSportGroupIconUrl(groupName);
  const eventCounts = new Map<string, number>();
  const now = new Date();
  const nowMs = now.getTime();

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("cached_events")
      .select("sport_key, commence_time, completed, status")
      .in(
        "sport_key",
        sortedLeagues.map((league) => league.key),
      )
      .gte(
        "commence_time",
        now.toISOString(),
      );

    for (const event of data ?? []) {
      if (!isVisibleMarketEvent(event, nowMs)) continue;
      const sportKey = event.sport_key as string;
      eventCounts.set(sportKey, (eventCounts.get(sportKey) ?? 0) + 1);
    }
  } catch {
    // Counts are helpful, but the category list can still render without them.
  }

  const totalEvents = [...eventCounts.values()].reduce((sum, count) => sum + count, 0);

  return (
    <div className="page-enter">
      <Link
        href="/app/sports"
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
      >
        <span aria-hidden>←</span>
        All sports
      </Link>

      <section className="relative -mx-4 overflow-hidden border-y border-border bg-panel/45 px-4 py-7 sm:mx-0 sm:px-6">
        <span aria-hidden className="terminal-grid absolute inset-0 opacity-70" />
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(70%_90%_at_50%_0%,rgba(16,185,129,0.13),transparent_70%)]"
        />

        <div className="relative flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-4 sm:gap-5">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border-strong bg-background/80 shadow-sm sm:h-20 sm:w-20">
              <SportGroupLogo group={groupName} logoUrl={groupLogoUrl} size="lg" />
            </span>
            <div>
              <p className="eyebrow mb-2">Sportsbook</p>
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {groupName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                Choose a league to see current paper-betting markets and event lines.
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-7 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-muted">Leagues</dt>
              <dd className="mt-1 font-display text-2xl font-semibold text-foreground">
                {leagues.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-muted">Events</dt>
              <dd className="mt-1 font-display text-2xl font-semibold text-foreground">
                {totalEvents}
              </dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-xs uppercase tracking-[0.16em] text-muted">Lines</dt>
              <dd className="mt-2 inline-flex rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                Market odds
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <ul className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {leaguesWithLogos.map((league, index) => {
          const eventCount = eventCounts.get(league.key) ?? 0;

          return (
            <li
              key={league.key}
              className="league-card-enter"
              style={{ "--delay": index } as CSSProperties}
            >
              <Link
                href={`/app/leagues/${league.key}`}
                className="group flex min-h-28 items-center justify-between gap-4 rounded-lg border border-border bg-panel/70 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:bg-panel-hover focus-visible:border-primary focus-visible:outline-none"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background/70 transition-colors group-hover:border-primary/40">
                    <LeagueLogo
                      title={league.title}
                      sportGroup={groupName}
                      logoUrl={league.logoUrl}
                      size="md"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">
                      {league.title}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {eventCount > 0
                        ? `${eventCount} event${eventCount !== 1 ? "s" : ""}`
                        : "Check odds"}
                    </span>
                  </span>
                </span>
                <span
                  aria-hidden
                  className="text-lg text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary"
                >
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
