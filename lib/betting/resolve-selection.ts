import { americanToDecimal } from "@/lib/betting/odds";
import { getCachedEvent } from "@/lib/odds/cache";
import {
  getMarketOddsProvider,
  getPreferredBookmaker,
  type MarketOddsProvider,
} from "@/lib/odds/provider";
import type { BetSelection, CachedEvent, EventOdds, MarketType } from "@/lib/types";

const DECIMAL_ODDS_TOLERANCE = 0.01;

function pickOddsBlob(
  event: CachedEvent,
  provider: MarketOddsProvider,
): EventOdds | null {
  if (provider === "model") {
    return (event.model_odds ?? event.odds) as EventOdds | null;
  }
  return event.odds as EventOdds;
}

function findOutcome(
  odds: EventOdds,
  market: MarketType,
  selectionName: string,
  line: number | null,
) {
  const preferred = getPreferredBookmaker();
  const bookmaker =
    odds.bookmakers?.find((b) => b.key === preferred) ?? odds.bookmakers?.[0];
  if (!bookmaker) return null;

  const marketData = bookmaker.markets.find((m) => m.key === market);
  if (!marketData) return null;

  return (
    marketData.outcomes.find((outcome) => {
      if (outcome.name !== selectionName) return false;
      const outcomeLine = outcome.point ?? null;
      if (line == null && outcomeLine == null) return true;
      if (line != null && outcomeLine != null) {
        return Math.abs(line - outcomeLine) < 0.001;
      }
      return false;
    }) ?? null
  );
}

export async function resolveCanonicalSelection(
  selection: BetSelection,
): Promise<{ error: string } | { selection: BetSelection }> {
  let event: CachedEvent;
  try {
    event = await getCachedEvent(selection.eventId);
  } catch {
    return { error: "Event not found" };
  }

  if (event.sport_key !== selection.sportKey) {
    return { error: "Event sport mismatch" };
  }

  const commence = new Date(event.commence_time);
  if (commence.getTime() <= Date.now()) {
    return { error: "Event has already started — betting is locked" };
  }

  const provider = getMarketOddsProvider();
  const odds = pickOddsBlob(event, provider);
  if (!odds?.bookmakers?.length) {
    return { error: "No odds available for this event" };
  }

  const outcome = findOutcome(
    odds,
    selection.market,
    selection.selection,
    selection.line,
  );
  if (!outcome) {
    return { error: "Selection no longer available at these odds" };
  }

  const canonicalDecimal = americanToDecimal(outcome.price);
  if (Math.abs(canonicalDecimal - selection.oddsDecimal) > DECIMAL_ODDS_TOLERANCE) {
    return { error: "Odds have changed — refresh and try again" };
  }

  const bookmaker =
    odds.bookmakers.find((b) => b.key === getPreferredBookmaker()) ??
    odds.bookmakers[0];
  const marketData = bookmaker.markets.find((m) => m.key === selection.market);
  const marketOutcomeNames = marketData?.outcomes.map((o) => o.name) ?? [];

  return {
    selection: {
      ...selection,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      commenceTime: event.commence_time,
      oddsAmerican: outcome.price,
      oddsDecimal: canonicalDecimal,
      line: outcome.point ?? null,
      oddsProvider: provider,
      bookmaker: bookmaker.title,
      oddsCapturedAt: new Date().toISOString(),
      marketOutcomeNames,
    },
  };
}
