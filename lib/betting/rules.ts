/** Settlement rule version — bump when logic changes. */
export const SETTLEMENT_RULE_VERSION = "v2";

/**
 * Settlement rules (v2):
 * - Pregame bets lock at commence_time; no in-play re-pricing.
 * - h2h: winner pays; two-way tie → push; three-way draw/tie outcome wins.
 * - spreads/totals: push when result equals line; half-points avoid pushes.
 * - void: postponed/cancelled events with no result within settlement window.
 * - Overtime included for NBA/NFL/NHL unless sport config says otherwise.
 * - Soccer regulation only for totals/spreads unless market specifies ET.
 * - Settlement is idempotent: one payout transaction per bet per outcome type.
 * - Corrected scores: only settle once status=final; no re-settlement in v2.
 */
export const SETTLEMENT_RULES_DOC = {
  version: SETTLEMENT_RULE_VERSION,
  pregameLock: true,
  drawAwareH2h: true,
  overtimeIncluded: ["basketball_nba", "americanfootball_nfl", "icehockey_nhl"],
  soccerRegulationOnly: true,
  voidOnPostponed: true,
  idempotent: true,
} as const;

export function shouldVoidEvent(status: string): boolean {
  return status === "postponed" || status === "cancelled";
}
