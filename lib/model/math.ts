/** Box-Muller transform for normal random variates. */
export function normalRandom(mean: number, stdDev: number): number {
  const u1 = Math.random() || 1e-10;
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Round to nearest 0.5 (standard betting line increment). */
export function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

/** Convert win probability to American odds. */
export function probabilityToAmerican(probability: number): number {
  const p = Math.min(0.99, Math.max(0.01, probability));
  if (p >= 0.5) {
    return Math.round(-100 * p / (1 - p));
  }
  return Math.round(100 * (1 - p) / p);
}

/** Apply bookmaker vig by inflating implied probability. */
export function applyVig(fairProbability: number, vig = 0.045): number {
  return Math.min(0.99, fairProbability * (1 + vig));
}

/** Standard spread/total juice. */
export const STANDARD_JUICE = -110;
