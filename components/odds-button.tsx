import Link from "next/link";
import { formatAmericanOdds } from "@/lib/betting/odds";
import { isTeamSelection, logoForSelection } from "@/lib/teams/logos";
import { TeamLogo } from "@/components/team-logo";
import type { CachedEvent, MarketType } from "@/lib/types";

interface OddsButtonProps {
  event: CachedEvent;
  market: MarketType;
  selection: string;
  american: number;
  line?: number | null;
  label: string;
}

export function OddsButton({
  event,
  market,
  selection,
  american,
  line,
  label,
}: OddsButtonProps) {
  const params = new URLSearchParams({
    market,
    selection,
    american: String(american),
    ...(line != null ? { line: String(line) } : {}),
  });

  const isTeam = isTeamSelection(label, event.home_team, event.away_team);
  const logo = logoForSelection(
    label,
    event.home_team,
    event.away_team,
    event.home_logo_url,
    event.away_logo_url,
  );
  const abbr =
    normalizeSelectionAbbr(label, event) ??
    (label === "Over" || label === "Under" ? label : null);

  return (
    <Link
      href={`/app/events/${event.event_id}?${params.toString()}`}
      className="flex flex-col items-center rounded-lg border border-border bg-background px-3 py-2 text-center transition hover:border-primary hover:bg-primary/5"
    >
      {isTeam && logo ? (
        <TeamLogo
          name={label}
          logoUrl={logo}
          abbreviation={abbr}
          size="sm"
        />
      ) : (
        <span className="text-xs font-medium text-muted">{abbr ?? label}</span>
      )}
      <span className="mt-1 font-mono text-sm font-semibold text-primary">
        {formatAmericanOdds(american)}
      </span>
      {line != null && (
        <span className="text-xs text-muted">{line > 0 ? `+${line}` : line}</span>
      )}
    </Link>
  );
}

function normalizeSelectionAbbr(label: string, event: CachedEvent): string | null {
  if (label === event.home_team) return event.home_team_abbr ?? null;
  if (label === event.away_team) return event.away_team_abbr ?? null;
  return null;
}
