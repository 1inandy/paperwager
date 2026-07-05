import Link from "next/link";
import { notFound } from "next/navigation";
import { TournamentLeaderboard } from "@/components/tournament-leaderboard";
import { getActor } from "@/lib/auth/actor";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/betting/odds";

interface TournamentDetailProps {
  params: Promise<{ id: string }>;
}

export default async function TournamentDetailPage({ params }: TournamentDetailProps) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor || actor.type !== "user") notFound();

  const admin = createAdminClient();

  const { data: tournament } = await admin
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (!tournament) notFound();

  const { data: participant } = await admin
    .from("tournament_participants")
    .select("id")
    .eq("tournament_id", id)
    .eq("user_id", actor.userId!)
    .maybeSingle();

  if (tournament.creator_id !== actor.userId && !participant) notFound();

  const { data: leaderboard } = await admin
    .from("tournament_leaderboard")
    .select("*")
    .eq("tournament_id", id)
    .order("rank");

  const isActive = tournament.status === "active" && new Date(tournament.ends_at) > new Date();

  return (
    <div>
      <Link href="/app/tournaments" className="mb-4 inline-block text-sm text-primary hover:underline">
        ← Back to tournaments
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          <p className="text-sm text-muted">
            {new Date(tournament.starts_at).toLocaleString()} —{" "}
            {new Date(tournament.ends_at).toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <span
            className={`text-sm font-medium capitalize ${
              isActive ? "text-primary" : "text-muted"
            }`}
          >
            {isActive ? "Active" : tournament.status}
          </span>
          <p className="text-xs text-muted">
            Starting balance: {formatCurrency(Number(tournament.starting_balance))}
          </p>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="mb-2 text-sm font-semibold text-muted">Invite code</h2>
        <p className="font-mono text-2xl font-bold tracking-widest text-primary">
          {tournament.invite_code}
        </p>
        <p className="mt-2 text-xs text-muted">
          Share this code with friends so they can join the tournament.
        </p>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Leaderboard</h2>
        <TournamentLeaderboard
          tournamentId={id}
          initialEntries={(leaderboard ?? []) as Parameters<typeof TournamentLeaderboard>[0]["initialEntries"]}
          currentUserId={actor?.type === "user" ? actor.userId : undefined}
        />
      </div>
    </div>
  );
}
