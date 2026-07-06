export const ENDLESS_TOURNAMENT_ENDS_AT = "9999-12-31T23:59:59.999Z";

export const TOURNAMENT_DURATION_OPTIONS = [
  { value: "24h", label: "24 hours" },
  { value: "1w", label: "1 week" },
  { value: "1m", label: "1 month" },
  { value: "infinite", label: "Infinite" },
  { value: "custom", label: "Custom" },
] as const;

export type TournamentDuration = (typeof TOURNAMENT_DURATION_OPTIONS)[number]["value"];

export function isTournamentDuration(value: FormDataEntryValue | null): value is TournamentDuration {
  return TOURNAMENT_DURATION_OPTIONS.some((option) => option.value === value);
}

export function isEndlessTournamentEnd(endsAt: string) {
  return new Date(endsAt).getTime() >= new Date(ENDLESS_TOURNAMENT_ENDS_AT).getTime();
}

export function resolveTournamentEndsAt({
  startsAt,
  duration,
  customEndsAt,
}: {
  startsAt: Date;
  duration: TournamentDuration;
  customEndsAt?: string | null;
}) {
  if (duration === "infinite") return new Date(ENDLESS_TOURNAMENT_ENDS_AT);

  if (duration === "custom") {
    if (!customEndsAt) throw new Error("Custom end time is required");
    return new Date(customEndsAt);
  }

  const endsAt = new Date(startsAt);

  if (duration === "24h") {
    endsAt.setHours(endsAt.getHours() + 24);
    return endsAt;
  }

  if (duration === "1w") {
    endsAt.setDate(endsAt.getDate() + 7);
    return endsAt;
  }

  endsAt.setMonth(endsAt.getMonth() + 1);
  return endsAt;
}

export function formatTournamentDateRange(
  startsAt: string,
  endsAt: string,
  format: "date" | "datetime" = "date",
) {
  const start = new Date(startsAt);
  const startLabel =
    format === "datetime" ? start.toLocaleString() : start.toLocaleDateString();

  if (isEndlessTournamentEnd(endsAt)) {
    return `${startLabel} - No end date`;
  }

  const end = new Date(endsAt);
  const endLabel =
    format === "datetime" ? end.toLocaleString() : end.toLocaleDateString();

  return `${startLabel} - ${endLabel}`;
}
