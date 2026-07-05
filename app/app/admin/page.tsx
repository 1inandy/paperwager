import { notFound } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import { getActor } from "@/lib/auth/actor";
import { getLatestQuotaLog } from "@/lib/odds/cache";
import {
  getMarketOddsProvider,
  isModelComparisonEnabled,
  isOddsApiEnabled,
} from "@/lib/odds/provider";
import { getLatestTrainingLog, getRatingsCount } from "@/lib/model/ratings";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminPage() {
  const actor = await getActor();
  if (!(await isCurrentUserAdmin(actor))) notFound();

  let pendingBets = 0;
  let cachedEvents = 0;
  let quota = null;
  let ratingsCount = 0;
  let trainingLog = null;
  const provider = getMarketOddsProvider();

  try {
    const admin = createAdminClient();
    const [{ count: pending }, { count: events }, quotaLog, ratings, training] =
      await Promise.all([
        admin.from("bets").select("*", { count: "exact", head: true }).eq("status", "pending"),
        admin.from("cached_events").select("*", { count: "exact", head: true }),
        isOddsApiEnabled() ? getLatestQuotaLog() : Promise.resolve(null),
        getRatingsCount(),
        getLatestTrainingLog(),
      ]);
    pendingBets = pending ?? 0;
    cachedEvents = events ?? 0;
    quota = quotaLog;
    ratingsCount = ratings;
    trainingLog = training;
  } catch {
    // DB not configured
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">System Status</h1>
      <p className="mb-6 text-sm text-muted">
        Market odds are primary. Model lines are comparison-only.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatusCard label="Market provider" value={provider} />
        <StatusCard label="Model comparison" value={isModelComparisonEnabled() ? "on" : "off"} />
        <StatusCard label="Cached events" value={String(cachedEvents)} />
        <StatusCard label="Pending bets" value={String(pendingBets)} />
        <StatusCard label="Team ratings" value={String(ratingsCount)} />
        <StatusCard
          label="Last training"
          value={
            trainingLog
              ? `${trainingLog.games_processed} games (${trainingLog.sport_key})`
              : "—"
          }
        />
        {isOddsApiEnabled() && (
          <>
            <StatusCard
              label="API credits remaining"
              value={quota?.credits_remaining != null ? String(quota.credits_remaining) : "—"}
            />
            <StatusCard
              label="Last API call"
              value={quota?.created_at ? new Date(quota.created_at).toLocaleString() : "—"}
            />
          </>
        )}
      </div>

      <div className="card mt-6 text-sm text-muted">
        <p className="mb-2 font-semibold text-foreground">Cron jobs (separated)</p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <code className="text-primary">sync-market-odds</code> — real bookmaker lines
          </li>
          <li>
            <code className="text-primary">generate-model-lines</code> — comparison only
          </li>
          <li>
            <code className="text-primary">train-model</code> — daily, not during sync
          </li>
          <li>
            <code className="text-primary">settle-bets</code> — idempotent settlement
          </li>
        </ul>
        <p className="mt-3">
          Production requires <code className="text-primary">CRON_SECRET</code> on all cron
          routes. Jobs use DB locks to prevent concurrent runs.
        </p>
      </div>
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold capitalize">{value}</p>
    </div>
  );
}
