/** Convert American odds to decimal odds. */
export function americanToDecimal(american: number): number {
  if (american > 0) {
    return american / 100 + 1;
  }
  return 100 / Math.abs(american) + 1;
}

/** Format American odds for display (+150, -110). */
export function formatAmericanOdds(american: number): string {
  return american > 0 ? `+${american}` : `${american}`;
}

/** Calculate total return (stake + profit) for a winning bet. */
export function calculatePayout(stake: number, oddsDecimal: number): number {
  return Math.round(stake * oddsDecimal * 100) / 100;
}

/** Calculate profit on a winning bet. */
export function calculateProfit(stake: number, oddsDecimal: number): number {
  return Math.round((stake * oddsDecimal - stake) * 100) / 100;
}

/** Format currency. */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Normalize team names for comparison. */
const TEAM_NAME_ALIASES: Record<string, string> = {
  usa: "united states",
  "u.s.a.": "united states",
  "u.s.": "united states",
  "united states of america": "united states",
};

export function normalizeTeamName(name: string): string {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, " ");
  return TEAM_NAME_ALIASES[normalized] ?? normalized;
}

export function teamsMatch(a: string, b: string): boolean {
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}
