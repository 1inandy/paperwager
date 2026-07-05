"use client";

import { useTransition } from "react";
import Link from "next/link";
import { joinTournamentAction } from "@/lib/actions";
import { formatCurrency } from "@/lib/betting/odds";
import type { Tournament } from "@/lib/types";

interface TournamentsClientProps {
  tournaments: Tournament[];
  isGuest: boolean;
}

export function TournamentsClient({
  tournaments,
  isGuest,
}: TournamentsClientProps) {
  const [pending, startTransition] = useTransition();

  function handleJoin(formData: FormData) {
    startTransition(async () => {
      try {
        await joinTournamentAction(formData.get("inviteCode") as string);
      } catch (err) {
        console.error(err);
      }
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tournaments</h1>
          <p className="text-sm text-muted">
            Compete with friends to see who wins the most fake money.
          </p>
        </div>
        {!isGuest && (
          <Link href="/app/tournaments/new" className="btn-primary">
            Create tournament
          </Link>
        )}
      </div>

      {isGuest && (
        <div className="card mb-6 border-accent/30 bg-accent/5 text-sm">
          Sign up to create or join tournaments.
        </div>
      )}

      {!isGuest && (
        <form action={handleJoin} className="card mb-8">
          <h3 className="mb-3 font-semibold">Join with invite code</h3>
          <div className="flex gap-3">
            <input
              name="inviteCode"
              type="text"
              required
              placeholder="ABCD1234"
              className="input flex-1 uppercase"
            />
            <button type="submit" disabled={pending} className="btn-primary">
              Join
            </button>
          </div>
        </form>
      )}

      {tournaments.length === 0 ? (
        <div className="card text-sm text-muted">
          No tournaments yet. Create one to challenge your friends.
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              href={`/app/tournaments/${t.id}`}
              className="card block transition hover:border-primary hover:bg-panel-hover"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{t.name}</h2>
                  <p className="text-xs text-muted">
                    {new Date(t.starts_at).toLocaleDateString()} —{" "}
                    {new Date(t.ends_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs font-medium capitalize ${
                      t.status === "active" ? "text-primary" : "text-muted"
                    }`}
                  >
                    {t.status}
                  </span>
                  <p className="text-xs text-muted">
                    Starting: {formatCurrency(Number(t.starting_balance))}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
