import { formatCurrency } from "@/lib/betting/odds";
import { getActor, getActiveScorecard } from "@/lib/auth/actor";
import { getBetsForScorecard } from "@/lib/actions";
import { BetRow } from "@/components/bet-row";
import { createAdminClient } from "@/lib/supabase/admin";
import { PendingBetsRefresh } from "@/components/pending-bets-refresh";

interface BetsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function BetsPage({ searchParams }: BetsPageProps) {
  const { tab = "open" } = await searchParams;
  const actor = await getActor();
  const scorecard = actor ? await getActiveScorecard(actor) : null;

  if (!scorecard) return null;

  const bets = await getBetsForScorecard(scorecard.id);
  const pendingCount = bets.filter((b) => b.status === "pending").length;
  const filtered =
    tab === "settled"
      ? bets.filter((b) => b.status !== "pending")
      : bets.filter((b) => b.status === "pending");

  const eventIds = [...new Set(filtered.map((b) => b.event_id))];
  const logoMap = new Map<string, {
    home_logo_url?: string | null;
    away_logo_url?: string | null;
    home_team_abbr?: string | null;
    away_team_abbr?: string | null;
  }>();

  if (eventIds.length > 0) {
    try {
      const admin = createAdminClient();
      const { data: events } = await admin
        .from("cached_events")
        .select("event_id, home_logo_url, away_logo_url, home_team_abbr, away_team_abbr")
        .in("event_id", eventIds);
      for (const e of events ?? []) {
        logoMap.set(e.event_id, e);
      }
    } catch {
      // Non-fatal
    }
  }

  return (
    <div>
      <PendingBetsRefresh pendingCount={pendingCount} />

      <h1 className="mb-2 text-2xl font-bold">My Bets</h1>
      <p className="mb-6 text-sm text-muted">
        Scorecard: {scorecard.name} — {formatCurrency(Number(scorecard.balance))}
      </p>

      <div className="mb-6 flex gap-2">
        <a
          href="/app/bets?tab=open"
          className={`rounded-lg px-4 py-2 text-sm ${
            tab === "open" ? "bg-primary/10 text-primary" : "text-muted hover:bg-panel"
          }`}
        >
          Open ({pendingCount})
        </a>
        <a
          href="/app/bets?tab=settled"
          className={`rounded-lg px-4 py-2 text-sm ${
            tab === "settled" ? "bg-primary/10 text-primary" : "text-muted hover:bg-panel"
          }`}
        >
          Settled ({bets.filter((b) => b.status !== "pending").length})
        </a>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-sm text-muted">
          No {tab === "open" ? "open" : "settled"} bets yet.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((bet) => (
            <BetRow key={bet.id} bet={bet} logos={logoMap.get(bet.event_id)} />
          ))}
        </div>
      )}
    </div>
  );
}
