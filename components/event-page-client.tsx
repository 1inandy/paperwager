"use client";

import { useState } from "react";
import { BetSlip } from "@/components/bet-slip";
import { LeagueLogo } from "@/components/entity-logo";
import { ModelComparison } from "@/components/model-comparison";
import { TeamMatchup, TeamLogo } from "@/components/team-logo";
import { americanToDecimal, formatAmericanOdds } from "@/lib/betting/odds";
import { isTeamSelection, logoForSelection } from "@/lib/teams/logos";
import type { BetSelection, CachedEvent, MarketType } from "@/lib/types";

interface EventPageClientProps {
  event: CachedEvent;
  scorecardId: string;
  balance: number;
  comparison?: {
    marketSpread: number | null;
    modelSpread: number | null;
    spreadEdge: number | null;
    totalEdge: number | null;
  } | null;
  initialMarket?: MarketType;
  initialSelection?: string;
  initialAmerican?: number;
  initialLine?: number;
  leagueLogoUrl?: string | null;
}

function buildSelection(
  event: CachedEvent,
  bookmakerTitle: string,
  market: MarketType,
  selection: string,
  line: number | null,
  american: number,
  marketOutcomeNames: string[] = [],
): BetSelection {
  return {
    eventId: event.event_id,
    sportKey: event.sport_key,
    homeTeam: event.home_team,
    awayTeam: event.away_team,
    commenceTime: event.commence_time,
    market,
    selection,
    line,
    oddsAmerican: american,
    oddsDecimal: americanToDecimal(american),
    oddsProvider: "api",
    bookmaker: bookmakerTitle,
    oddsCapturedAt: new Date().toISOString(),
    marketOutcomeNames,
    homeLogoUrl: event.home_logo_url,
    awayLogoUrl: event.away_logo_url,
    homeTeamAbbr: event.home_team_abbr,
    awayTeamAbbr: event.away_team_abbr,
  };
}

function getMarketOutcomeNames(event: CachedEvent, market: MarketType): string[] {
  return event.odds?.bookmakers?.[0]?.markets
    .find((m) => m.key === market)
    ?.outcomes.map((outcome) => outcome.name) ?? [];
}

export function EventPageClient({
  event,
  scorecardId,
  balance,
  comparison,
  initialMarket,
  initialSelection,
  initialAmerican,
  initialLine,
  leagueLogoUrl,
}: EventPageClientProps) {
  const bookmaker = event.odds?.bookmakers?.[0];
  const bookmakerTitle = bookmaker?.title ?? event.market_bookmaker ?? "Market";

  const [selection, setSelection] = useState<BetSelection | null>(() => {
    if (!initialMarket || !initialSelection || initialAmerican == null) return null;
    return buildSelection(
      event,
      bookmakerTitle,
      initialMarket,
      initialSelection,
      initialLine ?? null,
      initialAmerican,
      getMarketOutcomeNames(event, initialMarket),
    );
  });

  const markets = bookmaker?.markets ?? [];
  const tabs: { key: MarketType; label: string }[] = [
    { key: "h2h", label: "Moneyline" },
    { key: "spreads", label: "Spread" },
    { key: "totals", label: "Total (O/U)" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="card mb-6 text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-sm text-muted">
            {(leagueLogoUrl || event.sport_group) && (
              <LeagueLogo
                title={event.league ?? event.sport_key}
                sportGroup={event.sport_group}
                logoUrl={leagueLogoUrl}
                size="sm"
              />
            )}
            <span>
              {event.league && <span>{event.league} · </span>}
              {new Date(event.commence_time).toLocaleString()}
            </span>
          </div>
          <TeamMatchup
            awayTeam={event.away_team}
            homeTeam={event.home_team}
            awayLogo={event.away_logo_url}
            homeLogo={event.home_logo_url}
            awayAbbr={event.away_team_abbr}
            homeAbbr={event.home_team_abbr}
            size="xl"
          />
          <p className="mt-3 text-xs text-muted">
            Market lines via {bookmakerTitle}
          </p>
        </div>

        {comparison && (
          <ModelComparison
            homeTeam={event.home_team}
            homeLogoUrl={event.home_logo_url}
            homeTeamAbbr={event.home_team_abbr}
            marketSpread={comparison.marketSpread}
            modelSpread={comparison.modelSpread}
            spreadEdge={comparison.spreadEdge}
            totalEdge={comparison.totalEdge}
            marketBookmaker={bookmakerTitle}
          />
        )}

        {tabs.map(({ key, label }) => {
          const market = markets.find((m) => m.key === key);
          if (!market || market.outcomes.length === 0) return null;

          return (
            <div key={key} className="mb-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
                {label}
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {market.outcomes.map((outcome) => {
                  const isSelected =
                    selection?.market === key &&
                    selection.selection === outcome.name &&
                    selection.line === (outcome.point ?? null);

                  const isTeam = isTeamSelection(
                    outcome.name,
                    event.home_team,
                    event.away_team,
                  );
                  const logo = logoForSelection(
                    outcome.name,
                    event.home_team,
                    event.away_team,
                    event.home_logo_url,
                    event.away_logo_url,
                  );

                  return (
                    <button
                      key={`${outcome.name}-${outcome.point ?? ""}`}
                      type="button"
                      onClick={() =>
                        setSelection(
                          buildSelection(
                            event,
                            bookmakerTitle,
                            key,
                            outcome.name,
                            outcome.point ?? null,
                            outcome.price,
                            market.outcomes.map((marketOutcome) => marketOutcome.name),
                          ),
                        )
                      }
                      className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background hover:border-primary hover:bg-primary/5"
                      }`}
                    >
                      {isTeam && logo ? (
                        <TeamLogo
                          name={outcome.name}
                          logoUrl={logo}
                          abbreviation={
                            outcome.name === event.home_team
                              ? event.home_team_abbr
                              : event.away_team_abbr
                          }
                          size="md"
                        />
                      ) : (
                        <span className="font-medium">{outcome.name}</span>
                      )}
                      <span className="font-mono text-primary">
                        {formatAmericanOdds(outcome.price)}
                        {outcome.point != null && (
                          <span className="ml-2 text-xs text-muted">
                            ({outcome.point > 0 ? `+${outcome.point}` : outcome.point})
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <BetSlip
          scorecardId={scorecardId}
          balance={balance}
          selection={selection}
          onClear={() => setSelection(null)}
        />
      </div>
    </div>
  );
}
