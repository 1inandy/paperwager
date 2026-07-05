"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/betting/odds";

interface LeaderboardEntry {
  tournament_id: string;
  user_id: string;
  display_name: string | null;
  scorecard_id: string;
  balance: number;
  starting_balance: number;
  profit: number;
  roi_percent: number;
  rank: number;
}

interface TournamentLeaderboardProps {
  tournamentId: string;
  initialEntries: LeaderboardEntry[];
  currentUserId?: string;
}

export function TournamentLeaderboard({
  tournamentId,
  initialEntries,
  currentUserId,
}: TournamentLeaderboardProps) {
  const [entries, setEntries] = useState(initialEntries);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`tournament-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scorecards",
        },
        async () => {
          const { data } = await supabase
            .from("tournament_leaderboard")
            .select("*")
            .eq("tournament_id", tournamentId)
            .order("rank");
          if (data) setEntries(data as LeaderboardEntry[]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  if (entries.length === 0) {
    return <p className="text-sm text-muted">No participants yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th className="pb-2 pr-4">#</th>
            <th className="pb-2 pr-4">Player</th>
            <th className="pb-2 pr-4 text-right">Balance</th>
            <th className="pb-2 pr-4 text-right">Profit</th>
            <th className="pb-2 text-right">ROI</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.user_id}
              className={`border-b border-border/50 ${
                entry.user_id === currentUserId ? "bg-primary/5" : ""
              }`}
            >
              <td className="py-3 pr-4 font-mono">{entry.rank}</td>
              <td className="py-3 pr-4 font-medium">
                {entry.display_name ?? "Anonymous"}
                {entry.user_id === currentUserId && (
                  <span className="ml-2 text-xs text-primary">(you)</span>
                )}
              </td>
              <td className="py-3 pr-4 text-right font-mono">
                {formatCurrency(Number(entry.balance))}
              </td>
              <td
                className={`py-3 pr-4 text-right font-mono ${
                  Number(entry.profit) >= 0 ? "text-success" : "text-danger"
                }`}
              >
                {Number(entry.profit) >= 0 ? "+" : ""}
                {formatCurrency(Number(entry.profit))}
              </td>
              <td className="py-3 text-right font-mono text-muted">
                {entry.roi_percent}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
