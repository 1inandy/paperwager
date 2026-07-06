"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createScorecardAction,
  deleteScorecardAction,
  setActiveScorecardAction,
  setDefaultScorecardAction,
} from "@/lib/actions";
import { formatCurrency } from "@/lib/betting/odds";
import { formatTournamentDateRange } from "@/lib/tournaments/duration";
import type { Scorecard, TournamentRole, TournamentStatus } from "@/lib/types";

interface ScorecardStats {
  totalBets: number;
  openBets: number;
  winRate: number;
  openExposure: number;
  totalProfit: number;
}

interface ScorecardsClientProps {
  scorecards: Scorecard[];
  tournamentScorecards: TournamentScorecard[];
  statsMap: Record<string, ScorecardStats>;
  isGuest: boolean;
}

interface TournamentScorecard extends Scorecard {
  tournament: {
    id: string;
    name: string;
    status: TournamentStatus;
    starts_at: string;
    ends_at: string;
  };
  role: TournamentRole;
}

export function ScorecardsClient({
  scorecards,
  tournamentScorecards,
  statsMap,
  isGuest,
}: ScorecardsClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleUseForBetting(scorecardId: string, confirmationLabel: string) {
    startTransition(async () => {
      const result = await setActiveScorecardAction(scorecardId);
      if (!result.error) {
        router.push(
          `/app/sports?cardSet=${encodeURIComponent(confirmationLabel)}`,
        );
      }
    });
  }

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

      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">Personal scorecards</h2>
        <span className="text-sm text-muted">{scorecards.length} total</span>
      </div>

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
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleUseForBetting(sc.id, sc.name)}
                      className="btn-primary text-xs"
                    >
                      Make a bet
                    </button>
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

      {!isGuest && (
        <section className="mt-10">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Tournament scorecards</h2>
              <p className="text-sm text-muted">
                Entries tied to tournament leaderboards.
              </p>
            </div>
            <span className="text-sm text-muted">
              {tournamentScorecards.length} total
            </span>
          </div>

          {tournamentScorecards.length === 0 ? (
            <div className="card text-sm text-muted">
              Join or create a tournament to see those scorecards here.
            </div>
          ) : (
            <div className="space-y-4">
              {tournamentScorecards.map((sc) => {
                const stats = statsMap[sc.id];
                const profit = Number(sc.balance) - Number(sc.starting_balance);

                return (
                  <div key={sc.id} className="card">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            {sc.tournament.name}
                          </h3>
                          <span className="badge-upcoming capitalize">
                            {sc.role}
                          </span>
                          <span className="text-xs font-medium capitalize text-muted">
                            {sc.tournament.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {formatTournamentDateRange(
                            sc.tournament.starts_at,
                            sc.tournament.ends_at,
                          )}
                        </p>
                        <p className="mt-2 font-mono text-xl text-primary">
                          {formatCurrency(Number(sc.balance))}
                        </p>
                        <p
                          className={`text-sm font-mono ${
                            profit >= 0 ? "text-success" : "text-danger"
                          }`}
                        >
                          {profit >= 0 ? "+" : ""}
                          {formatCurrency(profit)} in tournament
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            handleUseForBetting(
                              sc.id,
                              `${sc.tournament.name} - tournament`,
                            )
                          }
                          className="btn-primary text-xs"
                        >
                          Make a bet
                        </button>
                        <Link
                          href={`/app/tournaments/${sc.tournament.id}`}
                          className="btn-secondary text-xs"
                        >
                          Open tournament
                        </Link>
                      </div>
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
          )}
        </section>
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
