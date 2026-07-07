"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelPendingBetAction } from "@/lib/actions";
import { formatCurrency } from "@/lib/betting/odds";

interface CancelBetButtonProps {
  betId: string;
  stake: number;
  commenceTime: string;
}

export function CancelBetButton({
  betId,
  stake,
  commenceTime,
}: CancelBetButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const startsAt = new Date(commenceTime).getTime();
    if (!Number.isFinite(startsAt)) return;

    function updateLock() {
      setLocked(startsAt <= Date.now());
    }

    updateLock();
    const delay = Math.min(Math.max(startsAt - Date.now(), 0), 2_147_483_647);
    const timeoutId = window.setTimeout(updateLock, delay);
    return () => window.clearTimeout(timeoutId);
  }, [commenceTime]);

  function handleCancel() {
    setError(null);

    if (new Date(commenceTime).getTime() <= Date.now()) {
      setLocked(true);
      setError("Event has already started — pending bets are locked");
      return;
    }

    if (
      !window.confirm(
        `Cancel this pending bet and refund ${formatCurrency(stake)}?`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await cancelPendingBetAction(betId);

      if (result.error) {
        setError(result.error);
        return;
      }

      router.push("/app/bets?cancelled=1");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {locked ? (
        <span className="rounded-lg border border-muted/30 px-3 py-1.5 text-xs font-semibold text-muted">
          Locked
        </span>
      ) : (
        <button
          type="button"
          onClick={handleCancel}
          disabled={pending}
          className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/10 disabled:opacity-50"
        >
          {pending ? "Cancelling..." : "Cancel"}
        </button>
      )}
      {error && <p className="max-w-48 text-right text-xs text-danger">{error}</p>}
    </div>
  );
}
