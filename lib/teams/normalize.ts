const STRIP_TOKENS = new Set([
  "fc",
  "sc",
  "afc",
  "cf",
  "ac",
  "cd",
  "sk",
  "fk",
  "bk",
  "if",
  "the",
  "de",
  "club",
  "team",
]);

/** Normalize team names for logo lookup (not used for bet settlement). */
export function normalizeTeamNameForLogo(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeTeamName(name: string): string[] {
  return normalizeTeamNameForLogo(name)
    .split(" ")
    .filter((token) => token.length > 1 && !STRIP_TOKENS.has(token));
}

export function teamNameVariants(name: string): string[] {
  const normalized = normalizeTeamNameForLogo(name);
  const tokens = tokenizeTeamName(name);
  const variants = new Set<string>([normalized]);

  if (tokens.length > 0) {
    variants.add(tokens.join(" "));
    variants.add(tokens[tokens.length - 1]);
    if (tokens.length >= 2) {
      variants.add(tokens.slice(-2).join(" "));
    }
  }

  return [...variants];
}

export function tokenOverlapScore(a: string, b: string): number {
  const ta = new Set(tokenizeTeamName(a));
  const tb = new Set(tokenizeTeamName(b));
  if (ta.size === 0 || tb.size === 0) return 0;

  let shared = 0;
  for (const token of ta) {
    if (tb.has(token)) shared++;
  }

  return shared / Math.max(ta.size, tb.size);
}
