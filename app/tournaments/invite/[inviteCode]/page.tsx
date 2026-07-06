import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { joinTournamentAction } from "@/lib/actions";
import { getActor } from "@/lib/auth/actor";
import { formatCurrency } from "@/lib/betting/odds";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatTournamentDateRange } from "@/lib/tournaments/duration";
import type { Tournament } from "@/lib/types";

interface TournamentInvitePageProps {
  params: Promise<{ inviteCode: string }>;
}

export default async function TournamentInvitePage({
  params,
}: TournamentInvitePageProps) {
  const { inviteCode } = await params;
  const code = inviteCode.trim().toUpperCase();
  const admin = createAdminClient();

  const { data: tournament } = await admin
    .from("tournaments")
    .select("*")
    .eq("invite_code", code)
    .eq("status", "active")
    .maybeSingle();

  if (!tournament) notFound();

  const activeTournament = tournament as Tournament;
  const actor = await getActor();
  const nextPath = `/tournaments/invite/${encodeURIComponent(code)}`;

  if (actor?.type === "user") {
    const { data: existing } = await admin
      .from("tournament_participants")
      .select("id")
      .eq("tournament_id", activeTournament.id)
      .eq("user_id", actor.userId!)
      .maybeSingle();

    if (existing) redirect(`/app/tournaments/${activeTournament.id}`);
  }

  async function joinFromInvite() {
    "use server";
    await joinTournamentAction(code);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="terminal-grid absolute inset-0 opacity-100" />
        <div className="absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(16,185,129,0.08),transparent_70%)]" />
      </div>

      <div className="page-enter w-full max-w-xl">
        <Link href="/" className="mb-8 flex items-center justify-center">
          <BrandLogo priority />
        </Link>

        <section className="card p-8 shadow-2xl shadow-black/20">
          <p className="eyebrow mb-4">Tournament invite</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {activeTournament.name}
          </h1>
          <p className="mt-3 text-sm text-muted">
            {formatTournamentDateRange(
              activeTournament.starts_at,
              activeTournament.ends_at,
              "datetime",
            )}
          </p>

          <div className="mt-6 grid gap-3 rounded-lg border border-border bg-background p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted">Starting balance</p>
              <p className="mt-1 font-semibold text-foreground">
                {formatCurrency(Number(activeTournament.starting_balance))}
              </p>
            </div>
            <div>
              <p className="text-muted">Invite code</p>
              <p className="mt-1 font-mono font-semibold tracking-widest text-primary">
                {activeTournament.invite_code}
              </p>
            </div>
          </div>

          {actor?.type === "user" ? (
            <form action={joinFromInvite} className="mt-6">
              <button type="submit" className="btn-primary w-full">
                Join tournament
              </button>
            </form>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href={`/login?next=${encodeURIComponent(nextPath)}`}
                className="btn-primary"
              >
                Log in to join
              </Link>
              <Link
                href={`/signup?next=${encodeURIComponent(nextPath)}`}
                className="btn-secondary"
              >
                Sign up to join
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
