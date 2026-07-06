import { NewTournamentForm } from "@/components/new-tournament-form";
import Link from "next/link";

export default function NewTournamentPage() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const defaultStart = tomorrow.toISOString().slice(0, 16);
  const defaultEnd = nextWeek.toISOString().slice(0, 16);

  return (
    <div className="max-w-lg">
      <Link href="/app/tournaments" className="mb-4 inline-block text-sm text-primary hover:underline">
        ← Back to tournaments
      </Link>
      <h1 className="mb-2 text-2xl font-bold">Create tournament</h1>
      <p className="mb-6 text-sm text-muted">
        Invite friends with a code and compete on a shared leaderboard.
      </p>

      <NewTournamentForm defaultStart={defaultStart} defaultCustomEnd={defaultEnd} />
    </div>
  );
}
