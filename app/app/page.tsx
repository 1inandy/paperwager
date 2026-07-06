import Link from "next/link";
import { getActor, getActiveScorecard } from "@/lib/auth/actor";
import { getBetsForScorecard } from "@/lib/actions";
import { formatAmericanOdds, formatCurrency } from "@/lib/betting/odds";
import { createAdminClient } from "@/lib/supabase/admin";
import { BalanceChart, type BalancePoint } from "@/components/balance-chart";
import { PendingBetsRefresh } from "@/components/pending-bets-refresh";
import type {
  Actor,
  BalanceTransaction,
  Bet,
  BetStatus,
  MarketType,
  Scorecard,
} from "@/lib/types";

const marketLabels: Record<MarketType, string> = {
  h2h: "Moneyline",
  spreads: "Spread",
  totals: "Total",
};

const statusStyles: Record<BetStatus, string> = {
  pending: "border-primary/30 bg-primary/10 text-primary",
  won: "border-success/30 bg-success/10 text-success",
  lost: "border-danger/30 bg-danger/10 text-danger",
  push: "border-muted/30 bg-muted/10 text-muted",
  void: "border-muted/30 bg-muted/10 text-muted",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function DashboardPage() {
  const actor = await getActor();
  if (!actor) return null;

  const [scorecard, displayName] = await Promise.all([
    getActiveScorecard(actor),
    getDisplayName(actor),
  ]);

  if (!scorecard) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Dashboard"
          title="Set up your first scorecard"
          description="Create a scorecard to start tracking paper bets, bankroll movement, and tournament entries."
        />
        <div className="rounded-lg border border-border bg-panel p-5">
          <Link href="/app/scorecards" className="btn-primary">
            Create scorecard
          </Link>
        </div>
      </div>
    );
  }

  const [bets, transactions] = await Promise.all([
    getBetsForScorecard(scorecard.id),
    getRecentTransactions(scorecard.id),
  ]);
  const stats = getDashboardStats(scorecard, bets);
  const balanceSeries = getRealizedBalanceSeries(scorecard, bets);
  const recentBets = bets.slice(0, 5);
  const nextOpenBets = bets
    .filter((bet) => bet.status === "pending")
    .sort(
      (a, b) =>
        new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime(),
    )
    .slice(0, 4);
  const greeting = displayName ? `Welcome, ${displayName}` : "Welcome back";

  return (
    <div className="page-enter space-y-8">
      <PendingBetsRefresh pendingCount={stats.openBets} />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <div className="rounded-lg border border-border bg-panel p-5 sm:p-6">
          <PageHeader
            eyebrow="Dashboard"
            title={greeting}
            description={`Active scorecard: ${scorecard.name}. Keep an eye on bankroll, exposure, and recent betting form.`}
          />

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Bankroll"
              value={formatCurrency(stats.balance)}
              detail={`${formatSignedCurrency(stats.bankrollChange)} all time`}
              tone={stats.bankrollChange >= 0 ? "positive" : "negative"}
            />
            <MetricCard
              label="Open exposure"
              value={formatCurrency(stats.openExposure)}
              detail={`${stats.openBets} pending bets`}
            />
            <MetricCard
              label="Win rate"
              value={`${stats.winRate}%`}
              detail={`${stats.gradedBets} graded bets`}
            />
            <MetricCard
              label="Settled P&L"
              value={formatSignedCurrency(stats.settledProfit)}
              detail="Excludes open bets"
              tone={stats.settledProfit >= 0 ? "positive" : "negative"}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/app/sports" className="btn-primary">
              Make a bet
            </Link>
            <Link href="/app/bets" className="btn-secondary">
              View bets
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-panel p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Active Scorecard
              </p>
              <h2 className="mt-2 text-lg font-semibold">{scorecard.name}</h2>
            </div>
            {scorecard.is_default && <span className="badge-upcoming">Default</span>}
          </div>

          <div className="mt-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-muted">Starting balance</p>
                <p className="font-mono text-sm">
                  {formatCurrency(stats.startingBalance)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">ROI</p>
                <p
                  className={`font-mono text-sm font-semibold ${
                    stats.roi >= 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {formatSignedPercent(stats.roi)}
                </p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
              <div
                className={`h-full rounded-full ${
                  stats.bankrollChange >= 0 ? "bg-primary" : "bg-danger"
                }`}
                style={{ width: `${stats.bankrollProgress}%` }}
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4">
            <MiniStat label="Total bets" value={String(stats.totalBets)} />
            <MiniStat label="Avg stake" value={formatCurrency(stats.averageStake)} />
            <MiniStat
              label="Open return"
              value={formatCurrency(stats.openPotentialReturn)}
            />
            <MiniStat label="Record" value={`${stats.wonBets}-${stats.lostBets}`} />
          </div>
        </div>
      </section>

      <Panel
        title="Realized Balance"
        action={<span className="text-xs text-muted">Open wagers excluded</span>}
      >
        <BalanceChart points={balanceSeries} />
      </Panel>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.45fr)]">
        <Panel
          title="Next Open Bets"
          action={
            <Link href="/app/bets" className="text-sm font-semibold text-primary">
              All bets
            </Link>
          }
        >
          {nextOpenBets.length > 0 ? (
            <div className="divide-y divide-border">
              {nextOpenBets.map((bet) => (
                <BetSummaryRow key={bet.id} bet={bet} />
              ))}
            </div>
          ) : (
            <EmptyPanel
              title="No open bets"
              description="Your next pending picks will show up here."
              href="/app/sports"
              action="Browse lines"
            />
          )}
        </Panel>

        <Panel title="Quick Actions">
          <div className="grid gap-2">
            <QuickLink
              href="/app/sports"
              label="Browse sportsbook"
              detail="Find markets by sport and league"
            />
            <QuickLink
              href="/app/scorecards"
              label="Manage scorecards"
              detail="Switch strategies or create another bankroll"
            />
            <QuickLink
              href="/app/tournaments"
              label="Tournaments"
              detail="Create or join a friendly competition"
            />
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Recent Bets"
          action={
            <Link href="/app/bets?tab=settled" className="text-sm font-semibold text-primary">
              Settled
            </Link>
          }
        >
          {recentBets.length > 0 ? (
            <div className="divide-y divide-border">
              {recentBets.map((bet) => (
                <BetSummaryRow key={bet.id} bet={bet} compact />
              ))}
            </div>
          ) : (
            <EmptyPanel
              title="No bets yet"
              description="Place a paper bet to start building your history."
              href="/app/sports"
              action="Make first bet"
            />
          )}
        </Panel>

        <Panel title="Balance Activity">
          {transactions.length > 0 ? (
            <div className="divide-y divide-border">
              {transactions.map((transaction) => (
                <ActivityRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          ) : (
            <EmptyPanel
              title="No balance activity"
              description="Stakes and settlements will appear here as your scorecard changes."
            />
          )}
        </Panel>
      </section>
    </div>
  );
}

async function getDisplayName(actor: Actor) {
  if (actor.type === "guest") return "Guest";

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", actor.userId!)
      .maybeSingle();
    return data?.display_name?.trim() || null;
  } catch {
    return null;
  }
}

async function getRecentTransactions(scorecardId: string) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("balance_transactions")
      .select("*")
      .eq("scorecard_id", scorecardId)
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) return [];
    return (data ?? []) as BalanceTransaction[];
  } catch {
    return [];
  }
}

function getDashboardStats(scorecard: Scorecard, bets: Bet[]) {
  const balance = Number(scorecard.balance);
  const startingBalance = Number(scorecard.starting_balance);
  const bankrollChange = balance - startingBalance;
  const pending = bets.filter((bet) => bet.status === "pending");
  const settled = bets.filter((bet) => bet.status !== "pending");
  const graded = bets.filter((bet) => bet.status === "won" || bet.status === "lost");
  const won = graded.filter((bet) => bet.status === "won");
  const lost = graded.filter((bet) => bet.status === "lost");
  const stakeSum = bets.reduce((sum, bet) => sum + Number(bet.stake), 0);
  const settledProfit = settled.reduce(
    (sum, bet) => sum + Number(bet.profit ?? 0),
    0,
  );
  const openExposure = pending.reduce((sum, bet) => sum + Number(bet.stake), 0);
  const openPotentialReturn = pending.reduce(
    (sum, bet) => sum + Number(bet.potential_payout),
    0,
  );
  const rawProgress =
    startingBalance > 0 ? Math.max(0, Math.min(balance / startingBalance, 1)) : 0;

  return {
    averageStake: bets.length > 0 ? stakeSum / bets.length : 0,
    balance,
    bankrollChange,
    bankrollProgress: Math.round(rawProgress * 100),
    gradedBets: graded.length,
    lostBets: lost.length,
    openBets: pending.length,
    openExposure,
    openPotentialReturn,
    roi: startingBalance > 0 ? (bankrollChange / startingBalance) * 100 : 0,
    settledBets: settled.length,
    settledProfit,
    startingBalance,
    totalBets: bets.length,
    winRate: graded.length > 0 ? Math.round((won.length / graded.length) * 100) : 0,
    wonBets: won.length,
  };
}

function getRealizedBalanceSeries(scorecard: Scorecard, bets: Bet[]) {
  const startingBalance = Number(scorecard.starting_balance);
  const settledBets = bets
    .filter((bet) => bet.status !== "pending")
    .sort((a, b) => {
      const aDate = new Date(a.settled_at ?? a.created_at).getTime();
      const bDate = new Date(b.settled_at ?? b.created_at).getTime();
      return aDate - bDate;
    });

  let realizedBalance = startingBalance;
  const points: BalancePoint[] = [
    {
      date: scorecard.created_at,
      balance: realizedBalance,
    },
  ];

  for (const bet of settledBets) {
    realizedBalance += getRealizedProfit(bet);
    points.push({
      date: bet.settled_at ?? bet.created_at,
      balance: realizedBalance,
    });
  }

  points.push({
    date: new Date().toISOString(),
    balance: realizedBalance,
  });

  return points;
}

function getRealizedProfit(bet: Bet) {
  if (bet.profit != null) return Number(bet.profit);
  if (bet.status === "won") return Number(bet.potential_payout) - Number(bet.stake);
  if (bet.status === "lost") return -Number(bet.stake);
  return 0;
}

function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="eyebrow mb-2">{eyebrow}</p>
      <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-danger"
        : "text-muted";

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 font-mono text-xl font-semibold">{value}</p>
      <p className={`mt-1 text-xs ${toneClass}`}>{detail}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 break-words font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}

function BetSummaryRow({ bet, compact = false }: { bet: Bet; compact?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold">{bet.selection}</p>
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${
              statusStyles[bet.status]
            }`}
          >
            {bet.status}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          {bet.away_team} at {bet.home_team}
        </p>
        {!compact && (
          <p className="mt-1 text-xs text-muted">{formatDateTime(bet.commence_time)}</p>
        )}
      </div>
      <div className="text-right">
        <p className="font-mono text-sm font-semibold">
          {formatCurrency(Number(bet.stake))}
        </p>
        <p className="text-xs text-muted">
          {marketLabels[bet.market]} {formatAmericanOdds(Number(bet.odds_american))}
        </p>
      </div>
    </div>
  );
}

function ActivityRow({ transaction }: { transaction: BalanceTransaction }) {
  const amount = Number(transaction.amount);

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">
          {transaction.description || formatTransactionType(transaction.type)}
        </p>
        <p className="mt-1 text-xs text-muted">
          {formatTransactionType(transaction.type)} -{" "}
          {formatDateTime(transaction.created_at)}
        </p>
      </div>
      <p
        className={`shrink-0 font-mono text-sm font-semibold ${
          amount >= 0 ? "text-success" : "text-danger"
        }`}
      >
        {formatSignedCurrency(amount)}
      </p>
    </div>
  );
}

function QuickLink({
  href,
  label,
  detail,
}: {
  href: string;
  label: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-border bg-background px-4 py-3 transition hover:border-primary hover:bg-panel-hover"
    >
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </Link>
  );
}

function EmptyPanel({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="px-5 py-8 text-sm text-muted">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1">{description}</p>
      {href && action && (
        <Link href={href} className="mt-4 inline-flex text-sm font-semibold text-primary">
          {action}
        </Link>
      )}
    </div>
  );
}

function formatSignedCurrency(amount: number) {
  return `${amount >= 0 ? "+" : ""}${formatCurrency(amount)}`;
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatTransactionType(type: string) {
  return type.replace(/_/g, " ");
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";
  return dateFormatter.format(date);
}
