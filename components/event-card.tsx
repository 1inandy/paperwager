import Link from "next/link";
import type { CachedEvent, EventOdds, MarketType } from "@/lib/types";
import { OddsButton } from "@/components/odds-button";
import { LeagueLogo } from "@/components/entity-logo";
import { TeamMatchup } from "@/components/team-logo";
import { americanToDecimal } from "@/lib/betting/odds";
import { getEventDisplayStatus } from "@/lib/events/status";
import { getLeagueLogoUrlSync } from "@/lib/teams/league-logos";

function getPrimaryBookmaker(odds: EventOdds) {
  return odds.bookmakers[0] ?? null;
}

function formatEventTime(commenceTime: string) {
  const date = new Date(commenceTime);
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface EventCardProps {
  event: CachedEvent;
  market?: MarketType;
  leagueLogoUrl?: string | null;
  sportGroup?: string | null;
}

export function EventCard({
  event,
  market = "h2h",
  leagueLogoUrl,
  sportGroup,
}: EventCardProps) {
  const bookmaker = getPrimaryBookmaker(event.odds as EventOdds);
  const marketData = bookmaker?.markets.find((m) => m.key === market);
  const displayStatus = getEventDisplayStatus(event);
  const logoUrl =
    leagueLogoUrl ?? getLeagueLogoUrlSync(event.sport_key);
  const leagueLabel = event.league ?? event.sport_key;

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs text-muted">
          {(logoUrl || sportGroup) && (
            <LeagueLogo
              title={leagueLabel}
              sportGroup={sportGroup}
              logoUrl={logoUrl}
              size="xs"
            />
          )}
          <span>{formatEventTime(event.commence_time)}</span>
        </span>
        <EventStatusBadge status={displayStatus} />
      </div>

      <Link
        href={`/app/events/${event.event_id}`}
        className="mb-4 block hover:opacity-90"
      >
        <TeamMatchup
          awayTeam={event.away_team}
          homeTeam={event.home_team}
          awayLogo={event.away_logo_url}
          homeLogo={event.home_logo_url}
          awayAbbr={event.away_team_abbr}
          homeAbbr={event.home_team_abbr}
          size="lg"
        />
      </Link>

      {marketData && marketData.outcomes.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {marketData.outcomes.slice(0, 3).map((outcome) => (
            <OddsButton
              key={`${outcome.name}-${outcome.point ?? ""}`}
              event={event}
              market={market}
              selection={outcome.name}
              american={outcome.price}
              line={outcome.point}
              label={outcome.name}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Odds unavailable</p>
      )}
    </div>
  );
}

function EventStatusBadge({ status }: { status: string }) {
  if (status === "live") return <span className="badge-live">Live</span>;
  if (status === "final") return <span className="badge-upcoming">Final</span>;
  if (status === "postponed") return <span className="badge-upcoming">Postponed</span>;
  if (status === "cancelled") return <span className="badge-upcoming">Cancelled</span>;
  return <span className="badge-upcoming">Upcoming</span>;
}

export { americanToDecimal, getPrimaryBookmaker };
