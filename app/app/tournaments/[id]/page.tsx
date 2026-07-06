import Link from "next/link";
import { notFound } from "next/navigation";
import { TournamentManagementPanel } from "@/components/tournament-management-panel";
import { TournamentLeaderboard } from "@/components/tournament-leaderboard";
import { TournamentShareLink } from "@/components/tournament-share-link";
import { getActor } from "@/lib/auth/actor";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/betting/odds";
import { getSiteOrigin } from "@/lib/site-url";
import { formatTournamentDateRange } from "@/lib/tournaments/duration";
import type { TournamentRole } from "@/lib/types";

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

  const { data: participant, error: participantError } = await admin
    .from("tournament_participants")
    .select("id, role")
    .eq("tournament_id", id)
    .eq("user_id", actor.userId!)
    .maybeSingle();

  if (participantError) throw new Error(participantError.message);

  if (tournament.creator_id !== actor.userId && !participant) notFound();

  const isOwner = tournament.creator_id === actor.userId;
  const role = (participant?.role ?? (isOwner ? "admin" : "member")) as TournamentRole;
  const canManage = isOwner || role === "admin";

  const { data: leaderboard } = await admin
    .from("tournament_leaderboard")
    .select("*")
    .eq("tournament_id", id)
    .order("rank");

  const { data: participants } = canManage
    ? await admin
        .from("tournament_participants")
        .select(
          "id, user_id, scorecard_id, role, joined_at, profiles(display_name), scorecards(balance, starting_balance)",
        )
        .eq("tournament_id", id)
        .order("joined_at", { ascending: true })
    : { data: [] };

  const isActive = tournament.status === "active" && new Date(tournament.ends_at) > new Date();
  const siteOrigin = await getSiteOrigin();
  const shareUrl = `${siteOrigin}/tournaments/invite/${encodeURIComponent(
    tournament.invite_code,
  )}`;

  return (
    <div>
      <Link href="/app/tournaments" className="mb-4 inline-block text-sm text-primary hover:underline">
        ← Back to tournaments
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          <p className="text-sm text-muted">
            {formatTournamentDateRange(
              tournament.starts_at,
              tournament.ends_at,
              "datetime",
            )}
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
          {canManage && (
            <div className="mt-3 flex justify-end">
              <TournamentManagementPanel
                tournament={tournament as Parameters<typeof TournamentManagementPanel>[0]["tournament"]}
                participants={(participants ?? []) as Parameters<typeof TournamentManagementPanel>[0]["participants"]}
                currentUserId={actor.userId!}
                isOwner={isOwner}
              />
            </div>
          )}
        </div>
      </div>

      <TournamentShareLink inviteCode={tournament.invite_code} shareUrl={shareUrl} />

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
