"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { placeBetAction } from "@/lib/actions";
import {
  calculatePayout,
  formatAmericanOdds,
  formatCurrency,
} from "@/lib/betting/odds";
import { isTeamSelection, logoForSelection } from "@/lib/teams/logos";
import { TeamLogo, TeamMatchup } from "@/components/team-logo";
import type { BetSelection } from "@/lib/types";

interface BetSlipProps {
  scorecardId: string;
  balance: number;
  selection: BetSelection | null;
  onClear: () => void;
}

export function BetSlip({
  scorecardId,
  balance,
  selection,
  onClear,
}: BetSlipProps) {
  const router = useRouter();
  const [stake, setStake] = useState("100");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!selection) {
    return (
      <div className="card">
        <h3 className="mb-2 font-semibold">Bet Slip</h3>
        <p className="text-sm text-muted">
          Select odds on an event to add a bet.
        </p>
      </div>
    );
  }

  const stakeNum = parseFloat(stake) || 0;
  const payout = calculatePayout(stakeNum, selection.oddsDecimal);
  const selectionLogo = logoForSelection(
    selection.selection,
    selection.homeTeam,
    selection.awayTeam,
    selection.homeLogoUrl,
    selection.awayLogoUrl,
  );
  const showTeamLogo = isTeamSelection(
    selection.selection,
    selection.homeTeam,
    selection.awayTeam,
  );

  function handlePlaceBet() {
    if (!selection) return;

    const selectedBet = selection;
    setError(null);

    startTransition(async () => {
      const result = await placeBetAction(scorecardId, selectedBet, stakeNum);
      if (result.error) {
        setError(result.error);
      } else {
        onClear();
        setStake("100");
        router.push("/app/bets?placed=1");
      }
    });
  }

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Bet Slip</h3>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-muted hover:text-foreground"
        >
          Clear
        </button>
      </div>

      <div className="mb-4 space-y-3 text-sm">
        <div className="flex justify-center">
          {showTeamLogo && selectionLogo ? (
            <TeamLogo
              name={selection.selection}
              logoUrl={selectionLogo}
              size="lg"
            />
          ) : (
            <span className="font-medium">{selection.selection}</span>
          )}
        </div>
        <TeamMatchup
          awayTeam={selection.awayTeam}
          homeTeam={selection.homeTeam}
          awayLogo={selection.awayLogoUrl}
          homeLogo={selection.homeLogoUrl}
          awayAbbr={selection.awayTeamAbbr}
          homeAbbr={selection.homeTeamAbbr}
          size="sm"
          layout="horizontal"
        />
        <p className="text-center text-muted capitalize">{selection.market}</p>
        <p className="text-center text-xs text-muted">Book: {selection.bookmaker}</p>
        {selection.line != null && (
          <p className="text-center text-muted">Line: {selection.line}</p>
        )}
        <p className="text-center font-mono text-primary">
          {formatAmericanOdds(selection.oddsAmerican)}
        </p>
      </div>

      <div className="mb-4">
        <label htmlFor="stake" className="mb-1 block text-xs text-muted">
          Stake
        </label>
        <input
          id="stake"
          type="number"
          min="1"
          step="1"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          className="input font-mono"
        />
        <p className="mt-1 text-xs text-muted">
          Balance: {formatCurrency(balance)}
        </p>
      </div>

      <div className="mb-4 flex justify-between text-sm">
        <span className="text-muted">Potential payout</span>
        <span className="font-mono font-semibold text-primary">
          {formatCurrency(payout)}
        </span>
      </div>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      <button
        type="button"
        onClick={handlePlaceBet}
        disabled={pending || stakeNum <= 0}
        className="btn-primary w-full disabled:opacity-50"
      >
        {pending ? "Placing…" : "Place bet"}
      </button>
    </div>
  );
}
