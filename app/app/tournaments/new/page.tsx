import { createTournamentAction } from "@/lib/actions";
import { STARTING_BALANCE } from "@/lib/constants";
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

      <form action={createTournamentAction} className="card space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm text-muted">
            Tournament name
          </label>
          <input id="name" name="name" type="text" required className="input" placeholder="Weekend NFL Challenge" />
        </div>
        <div>
          <label htmlFor="startingBalance" className="mb-1 block text-sm text-muted">
            Starting balance
          </label>
          <input
            id="startingBalance"
            name="startingBalance"
            type="number"
            defaultValue={STARTING_BALANCE}
            min={100}
            step={100}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="startsAt" className="mb-1 block text-sm text-muted">
            Starts
          </label>
          <input id="startsAt" name="startsAt" type="datetime-local" required defaultValue={defaultStart} className="input" />
        </div>
        <div>
          <label htmlFor="endsAt" className="mb-1 block text-sm text-muted">
            Ends
          </label>
          <input id="endsAt" name="endsAt" type="datetime-local" required defaultValue={defaultEnd} className="input" />
        </div>
        <button type="submit" className="btn-primary w-full">
          Create tournament
        </button>
      </form>
    </div>
  );
}
