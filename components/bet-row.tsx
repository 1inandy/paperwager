import { formatCurrency, formatAmericanOdds } from "@/lib/betting/odds";
import { TeamMatchup, TeamLogo } from "@/components/team-logo";
import { isTeamSelection, logoForSelection } from "@/lib/teams/logos";
import { CancelBetButton } from "@/components/cancel-bet-button";
import type { BetStatus } from "@/lib/types";

const statusColors: Record<BetStatus, string> = {
  pending: "text-accent",
  won: "text-success",
  lost: "text-danger",
  push: "text-muted",
  void: "text-muted",
};

interface BetRowProps {
  bet: {
    id: string;
    selection: string;
    away_team: string;
    home_team: string;
    market: string;
    line: number | null;
    odds_american: number;
    stake: number;
    potential_payout: number;
    profit: number | null;
    status: string;
  };
  logos?: {
    home_logo_url?: string | null;
    away_logo_url?: string | null;
    home_team_abbr?: string | null;
    away_team_abbr?: string | null;
  } | null;
}

export function BetRow({ bet, logos }: BetRowProps) {
  const selectionLogo = logoForSelection(
    bet.selection,
    bet.home_team,
    bet.away_team,
    logos?.home_logo_url,
    logos?.away_logo_url,
  );
  const showTeamLogo = isTeamSelection(bet.selection, bet.home_team, bet.away_team);

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {showTeamLogo && selectionLogo ? (
            <TeamLogo name={bet.selection} logoUrl={selectionLogo} size="md" />
          ) : null}
          <div>
            {!showTeamLogo && <p className="font-semibold">{bet.selection}</p>}
            <div className="my-2">
              <TeamMatchup
                awayTeam={bet.away_team}
                homeTeam={bet.home_team}
                awayLogo={logos?.away_logo_url}
                homeLogo={logos?.home_logo_url}
                awayAbbr={logos?.away_team_abbr}
                homeAbbr={logos?.home_team_abbr}
                size="sm"
                layout="horizontal"
              />
            </div>
            <p className="text-xs text-muted capitalize">
              {bet.market}
              {bet.line != null ? ` (${bet.line})` : ""} ·{" "}
              {formatAmericanOdds(bet.odds_american)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`text-sm font-semibold capitalize ${statusColors[bet.status as BetStatus]}`}
          >
            {bet.status}
          </span>
          {bet.status === "pending" && (
            <CancelBetButton betId={bet.id} stake={Number(bet.stake)} />
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <span>
          Stake:{" "}
          <span className="font-mono">{formatCurrency(Number(bet.stake))}</span>
        </span>
        <span>
          To win:{" "}
          <span className="font-mono text-primary">
            {formatCurrency(Number(bet.potential_payout))}
          </span>
        </span>
        {bet.profit != null && bet.status !== "pending" && (
          <span>
            P&L:{" "}
            <span
              className={`font-mono ${
                Number(bet.profit) >= 0 ? "text-success" : "text-danger"
              }`}
            >
              {Number(bet.profit) >= 0 ? "+" : ""}
              {formatCurrency(Number(bet.profit))}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
