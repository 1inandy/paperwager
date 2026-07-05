/** Market odds source for paper bets (default: The Odds API). */
export type MarketOddsProvider = "api" | "model";

/** Whether optional PaperWager Model comparison lines are generated. */
export function isModelComparisonEnabled(): boolean {
  return process.env.MODEL_LINES_ENABLED !== "false";
}

/** Primary provider used when placing bets — real bookmaker lines when API key is set. */
export function getMarketOddsProvider(): MarketOddsProvider {
  const explicit = process.env.ODDS_PROVIDER?.toLowerCase();
  if (explicit === "model") return "model";
  if (process.env.ODDS_API_KEY) return "api";
  return "model";
}

export function isOddsApiEnabled(): boolean {
  return getMarketOddsProvider() === "api" && Boolean(process.env.ODDS_API_KEY);
}

export function isModelOddsEnabled(): boolean {
  return getMarketOddsProvider() === "model";
}

/** Can users browse and bet on anything? */
export function isOddsConfigured(): boolean {
  return isOddsApiEnabled() || isModelOddsEnabled();
}

/** Preferred single bookmaker for market lines (consistency). */
export function getPreferredBookmaker(): string {
  return process.env.MARKET_BOOKMAKER ?? "draftkings";
}

/** @deprecated use getMarketOddsProvider */
export type OddsProvider = MarketOddsProvider;
export function getOddsProvider(): MarketOddsProvider {
  return getMarketOddsProvider();
}
