"use client";

import { useTransition } from "react";
import {
  createScorecardAction,
  deleteScorecardAction,
  setDefaultScorecardAction,
} from "@/lib/actions";
import { formatCurrency } from "@/lib/betting/odds";
import type { Scorecard } from "@/lib/types";

interface ScorecardStats {
  totalBets: number;
  openBets: number;
  winRate: number;
  openExposure: number;
  totalProfit: number;
}

interface ScorecardsClientProps {
  scorecards: Scorecard[];
  statsMap: Record<string, ScorecardStats>;
  isGuest: boolean;
}

export function ScorecardsClient({
  scorecards,
  statsMap,
  isGuest,
}: ScorecardsClientProps) {
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Scorecards</h1>
      <p className="mb-6 text-sm text-muted">
        Track different betting strategies with separate virtual bankrolls.
      </p>

      {isGuest && (
        <div className="card mb-6 border-accent/30 bg-accent/5 text-sm">
          Guest mode uses a single scorecard. Sign up to create multiple
          scorecards.
        </div>
      )}

      <div className="mb-8 space-y-4">
        {scorecards.map((sc) => {
          const stats = statsMap[sc.id];
          const profit = Number(sc.balance) - Number(sc.starting_balance);

          return (
            <div key={sc.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{sc.name}</h2>
                    {sc.is_default && (
                      <span className="badge-upcoming">Default</span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-xl text-primary">
                    {formatCurrency(Number(sc.balance))}
                  </p>
                  <p
                    className={`text-sm font-mono ${
                      profit >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {profit >= 0 ? "+" : ""}
                    {formatCurrency(profit)} all time
                  </p>
                </div>

                {!isGuest && (
                  <div className="flex gap-2">
                    {!sc.is_default && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await setDefaultScorecardAction(sc.id);
                          })
                        }
                        className="btn-secondary text-xs"
                      >
                        Set default
                      </button>
                    )}
                    {scorecards.length > 1 && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await deleteScorecardAction(sc.id);
                          })
                        }
                        className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs text-danger hover:bg-danger/10"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>

              {stats && (
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
                  <Stat label="Total bets" value={String(stats.totalBets)} />
                  <Stat label="Open bets" value={String(stats.openBets)} />
                  <Stat label="Win rate" value={`${stats.winRate}%`} />
                  <Stat
                    label="Open exposure"
                    value={formatCurrency(stats.openExposure)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isGuest && (
        <form
          action={(formData) => {
            startTransition(async () => {
              await createScorecardAction(formData.get("name") as string);
            });
          }}
          className="card"
        >
          <h3 className="mb-3 font-semibold">Create scorecard</h3>
          <div className="flex gap-3">
            <input
              name="name"
              type="text"
              required
              placeholder="Strategy name"
              className="input flex-1"
            />
            <button type="submit" disabled={pending} className="btn-primary">
              Create
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}
