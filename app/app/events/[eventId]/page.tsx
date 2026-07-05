import { notFound } from "next/navigation";
import { EventPageClient } from "@/components/event-page-client";
import { getActor, getActiveScorecard } from "@/lib/auth/actor";
import { getCachedEvent } from "@/lib/odds/cache";
import { getModelComparisonForEvent } from "@/lib/model/generate-lines";
import { getLeagueLogoUrl } from "@/lib/teams/league-logos";
import type { MarketType } from "@/lib/types";

interface EventPageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{
    market?: string;
    selection?: string;
    american?: string;
    line?: string;
  }>;
}

export default async function EventPage({ params, searchParams }: EventPageProps) {
  const { eventId } = await params;
  const query = await searchParams;

  let event;
  try {
    event = await getCachedEvent(eventId);
  } catch {
    notFound();
  }

  const actor = await getActor();
  const scorecard = actor ? await getActiveScorecard(actor) : null;

  if (!scorecard) notFound();

  const market = query.market as MarketType | undefined;
  const american = query.american ? parseInt(query.american, 10) : undefined;
  const line = query.line ? parseFloat(query.line) : undefined;

  const comparison = await getModelComparisonForEvent({
    home_team: event.home_team,
    away_team: event.away_team,
    sport_key: event.sport_key,
    odds: event.odds,
    model_odds: event.model_odds,
  });

  const leagueLogoUrl = await getLeagueLogoUrl(
    event.sport_key,
    event.league ?? event.sport_key,
  );

  return (
    <EventPageClient
      event={event}
      scorecardId={scorecard.id}
      balance={Number(scorecard.balance)}
      comparison={comparison}
      leagueLogoUrl={leagueLogoUrl}
      initialMarket={market}
      initialSelection={query.selection}
      initialAmerican={american}
      initialLine={line}
    />
  );
}
