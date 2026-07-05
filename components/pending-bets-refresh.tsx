"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_REFRESH_MS = 60_000;

export function PendingBetsRefresh({
  pendingCount,
  intervalMs = DEFAULT_REFRESH_MS,
}: {
  pendingCount: number;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (pendingCount <= 0) return;

    const refresh = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };

    const intervalId = window.setInterval(refresh, intervalMs);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [intervalMs, pendingCount, router]);

  return null;
}
