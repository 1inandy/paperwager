import type { EventStatus } from "@/lib/events/types";

const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

type EventStatusInput = {
  commence_time: string;
  completed?: boolean | null;
  status?: string | null;
};

export function isFinalEvent(event: EventStatusInput) {
  return event.completed === true || event.status === "final";
}

export function isInactiveEvent(event: EventStatusInput) {
  return (
    isFinalEvent(event) ||
    event.status === "postponed" ||
    event.status === "cancelled"
  );
}

export function isLiveEvent(event: EventStatusInput, now = Date.now()) {
  if (isInactiveEvent(event)) return false;

  const start = new Date(event.commence_time).getTime();
  return start <= now && now <= start + LIVE_WINDOW_MS;
}

export function isVisibleMarketEvent(event: EventStatusInput, now = Date.now()) {
  if (isInactiveEvent(event)) return false;

  const start = new Date(event.commence_time).getTime();
  return Number.isFinite(start) && start > now;
}

export function getEventDisplayStatus(event: EventStatusInput): EventStatus {
  if (isFinalEvent(event)) return "final";
  if (event.status === "postponed" || event.status === "cancelled") {
    return event.status;
  }
  if (isLiveEvent(event)) return "live";
  return "scheduled";
}
