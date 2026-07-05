import { TeamLogo } from "@/components/team-logo";
import type { EventOdds } from "@/lib/types";

interface ModelComparisonProps {
  homeTeam: string;
  homeLogoUrl?: string | null;
  homeTeamAbbr?: string | null;
  marketSpread: number | null;
  modelSpread: number | null;
  spreadEdge: number | null;
  totalEdge: number | null;
  marketBookmaker?: string | null;
}

export function ModelComparison({
  homeTeam,
  homeLogoUrl,
  homeTeamAbbr,
  marketSpread,
  modelSpread,
  spreadEdge,
  totalEdge,
  marketBookmaker,
}: ModelComparisonProps) {
  if (modelSpread == null && spreadEdge == null) return null;

  return (
    <div className="card mb-6 border-primary/20 bg-primary/5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
        PaperWager Model vs Market
      </h2>
      <p className="mb-4 text-xs text-muted">
        Model lines are for analysis only. Paper bets use{" "}
        {marketBookmaker ?? "market"} lines.
      </p>

      <div className="space-y-3 text-sm">
        {marketSpread != null && modelSpread != null && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="mb-2 flex items-center gap-2">
                <TeamLogo
                  name={homeTeam}
                  logoUrl={homeLogoUrl}
                  abbreviation={homeTeamAbbr}
                  size="xs"
                />
                <p className="text-xs text-muted">Market spread</p>
              </div>
              <p className="font-mono text-lg font-semibold">
                {marketSpread > 0 ? `+${marketSpread}` : marketSpread}
              </p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-background p-3">
              <p className="text-xs text-muted">PaperWager model</p>
              <p className="font-mono text-lg font-semibold text-primary">
                {modelSpread > 0 ? `+${modelSpread}` : modelSpread}
              </p>
            </div>
          </div>
        )}

        {spreadEdge != null && (
          <p>
            Spread edge:{" "}
            <span className="font-mono font-semibold text-primary">
              {spreadEdge > 0 ? "+" : ""}
              {spreadEdge} pts
            </span>
          </p>
        )}

        {totalEdge != null && (
          <p>
            Total edge:{" "}
            <span className="font-mono font-semibold text-primary">
              {totalEdge > 0 ? "+" : ""}
              {totalEdge} pts
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export function extractSpreadLine(
  odds: EventOdds | null | undefined,
  homeTeam: string,
): number | null {
  const spread = odds?.bookmakers?.[0]?.markets.find((m) => m.key === "spreads");
  return spread?.outcomes.find((o) => o.name === homeTeam)?.point ?? null;
}
