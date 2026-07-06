"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelPendingBetAction } from "@/lib/actions";
import { formatCurrency } from "@/lib/betting/odds";

interface CancelBetButtonProps {
  betId: string;
  stake: number;
}

export function CancelBetButton({ betId, stake }: CancelBetButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCancel() {
    setError(null);

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
      <button
        type="button"
        onClick={handleCancel}
        disabled={pending}
        className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/10 disabled:opacity-50"
      >
        {pending ? "Cancelling..." : "Cancel"}
      </button>
      {error && <p className="max-w-48 text-right text-xs text-danger">{error}</p>}
    </div>
  );
}
