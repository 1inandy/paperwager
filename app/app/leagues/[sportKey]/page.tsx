import Link from "next/link";
import { EventCard } from "@/components/event-card";
import { LeagueLogo } from "@/components/entity-logo";
import { getCachedEventsBySport } from "@/lib/odds/cache";
import { syncMarketOddsForSport } from "@/lib/odds/market-sync";
import { isOddsConfigured, isOddsApiEnabled } from "@/lib/odds/provider";
import { getLeagueLogoUrl } from "@/lib/teams/league-logos";
import { createAdminClient } from "@/lib/supabase/admin";
import { isVisibleMarketEvent } from "@/lib/events/status";

interface LeaguePageProps {
  params: Promise<{ sportKey: string }>;
}

export default async function LeaguePage({ params }: LeaguePageProps) {
  const { sportKey } = await params;

  let leagueTitle = sportKey;
  let sportGroup: string | null = null;
  let leagueLogoUrl: string | null = null;
  let events: Awaited<ReturnType<typeof getCachedEventsBySport>> = [];
  let checkedLiveOdds = false;

  if (isOddsConfigured()) {
    try {
      const admin = createAdminClient();
      const { data: sport } = await admin
        .from("cached_sports")
        .select("title, sport_group")
        .eq("key", sportKey)
        .maybeSingle();
      if (sport?.title) leagueTitle = sport.title;
      sportGroup = sport?.sport_group ?? null;
      leagueLogoUrl = await getLeagueLogoUrl(sportKey, leagueTitle);

      events = await getCachedEventsBySport(sportKey);
      if (events.length === 0 && isOddsApiEnabled()) {
        checkedLiveOdds = true;
        await syncMarketOddsForSport(sportKey);
        events = await getCachedEventsBySport(sportKey);
      }
    } catch {
      // DB not ready
    }
  }

  const now = new Date().getTime();
  const upcoming = events.filter((event) => isVisibleMarketEvent(event, now));

  const grouped = upcoming.reduce<Record<string, typeof events>>((acc, event) => {
    const date = new Date(event.commence_time).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {});

  return (
    <div className="page-enter">
      <Link href="/app/sports" className="mb-4 inline-block text-sm text-primary hover:underline">
        ← All sports
      </Link>
      <div className="mb-6 flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-panel/70">
          <LeagueLogo
            title={leagueTitle}
            sportGroup={sportGroup}
            logoUrl={leagueLogoUrl}
            size="lg"
          />
        </span>
        <div>
          <h1 className="text-2xl font-bold">{leagueTitle}</h1>
          <p className="text-sm text-muted">
            {upcoming.length} event{upcoming.length !== 1 ? "s" : ""} ·{" "}
            {isOddsApiEnabled() ? "Market lines" : "Model fallback lines"}
          </p>
        </div>
      </div>

      {upcoming.length === 0 ? (
        <div className="card text-sm text-muted">
          {checkedLiveOdds
            ? "The Odds API did not return upcoming bookmaker odds for this league."
            : "No upcoming odds are cached for this league yet."}
        </div>
      ) : (
        Object.entries(grouped).map(([date, dateEvents]) => (
          <section key={date} className="mb-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
              {date}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {dateEvents.map((event) => (
                <EventCard
                  key={event.event_id}
                  event={event}
                  leagueLogoUrl={leagueLogoUrl}
                  sportGroup={sportGroup}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
