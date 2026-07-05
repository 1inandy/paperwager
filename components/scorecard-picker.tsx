"use client";

import { formatCurrency } from "@/lib/betting/odds";
import type { Scorecard } from "@/lib/types";

interface ScorecardPickerProps {
  scorecards: Scorecard[];
  activeId: string;
  onChange?: (id: string) => void;
}

export function ScorecardPicker({
  scorecards,
  activeId,
  onChange,
}: ScorecardPickerProps) {
  const active = scorecards.find((s) => s.id === activeId) ?? scorecards[0];

  return (
    <div className="flex items-center gap-3">
      <select
        value={active?.id ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="input max-w-[200px] py-1.5 text-sm"
      >
        {scorecards.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {active && (
        <span className="font-mono text-sm font-semibold text-primary">
          {formatCurrency(Number(active.balance))}
        </span>
      )}
    </div>
  );
}
