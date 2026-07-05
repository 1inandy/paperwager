"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/betting/odds";

export interface BalancePoint {
  date: string;
  balance: number;
}

type TimeRangeKey = "1w" | "1m" | "3m" | "1y" | "all";

const TIME_RANGES: { key: TimeRangeKey; label: string; days: number | null }[] = [
  { key: "1w", label: "1W", days: 7 },
  { key: "1m", label: "1M", days: 30 },
  { key: "3m", label: "3M", days: 90 },
  { key: "1y", label: "1Y", days: 365 },
  { key: "all", label: "All", days: null },
];

const chartDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export function BalanceChart({ points }: { points: BalancePoint[] }) {
  const [range, setRange] = useState<TimeRangeKey>("all");
  const visiblePoints = useMemo(
    () => filterPointsForRange(points, range),
    [points, range],
  );

  return (
    <div className="px-5 py-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <ChartSummary points={visiblePoints} />
        <div
          className="grid grid-cols-5 overflow-hidden rounded-lg border border-border bg-background p-1"
          aria-label="Balance chart range"
        >
          {TIME_RANGES.map((option) => {
            const selected = option.key === range;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setRange(option.key)}
                className={`h-8 min-w-10 rounded-md px-2 text-xs font-semibold transition ${
                  selected
                    ? "bg-primary text-background"
                    : "text-muted hover:bg-panel hover:text-foreground"
                }`}
                aria-pressed={selected}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <BalanceSvg points={visiblePoints} />
    </div>
  );
}

function ChartSummary({ points }: { points: BalancePoint[] }) {
  const first = points[0];
  const latest = points[points.length - 1];
  const balances = points.map((point) => point.balance);
  const trend = latest.balance - first.balance;
  const minBalance = Math.min(...balances);
  const maxBalance = Math.max(...balances);

  return (
    <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-3">
      <ChartMiniStat label="Realized balance" value={formatCurrency(latest.balance)} />
      <ChartMiniStat label="Realized change" value={formatSignedCurrency(trend)} />
      <ChartMiniStat
        label="Range"
        value={`${formatShortCurrency(minBalance)} to ${formatShortCurrency(maxBalance)}`}
      />
    </div>
  );
}

function BalanceSvg({ points }: { points: BalancePoint[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const width = 760;
  const height = 260;
  const padding = {
    top: 24,
    right: 24,
    bottom: 42,
    left: 68,
  };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const balances = points.map((point) => point.balance);
  const first = points[0];
  const latest = points[points.length - 1];
  const trend = latest.balance - first.balance;
  const minBalance = Math.min(...balances);
  const maxBalance = Math.max(...balances);
  const range = maxBalance - minBalance;
  const pad = range === 0 ? Math.max(100, Math.abs(maxBalance) * 0.02) : range * 0.16;
  const minYValue = minBalance - pad;
  const maxYValue = maxBalance + pad;
  const yRange = maxYValue - minYValue || 1;
  const chartPoints = points.map((point, index) => {
    const x =
      padding.left +
      (points.length === 1 ? chartWidth : (chartWidth / (points.length - 1)) * index);
    const y =
      padding.top +
      chartHeight -
      ((point.balance - minYValue) / yRange) * chartHeight;
    return { ...point, x, y };
  });
  const linePath = chartPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = [
    `M ${chartPoints[0].x} ${padding.top + chartHeight}`,
    ...chartPoints.map((point) => `L ${point.x} ${point.y}`),
    `L ${chartPoints[chartPoints.length - 1].x} ${padding.top + chartHeight}`,
    "Z",
  ].join(" ");
  const ticks = [maxYValue, (maxYValue + minYValue) / 2, minYValue];
  const stroke = trend >= 0 ? "var(--success)" : "var(--danger)";
  const hoveredPoint =
    hoveredIndex !== null ? (chartPoints[hoveredIndex] ?? null) : null;

  return (
    <div className="relative rounded-lg border border-border bg-background">
      <svg
        role="img"
        aria-label="Realized account balance over time"
        viewBox={`0 0 ${width} ${height}`}
        className="h-[260px] w-full"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id="balance-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.24" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => {
          const y =
            padding.top + chartHeight - ((tick - minYValue) / yRange) * chartHeight;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeDasharray="4 6"
              />
              <text
                x={padding.left - 12}
                y={y + 4}
                textAnchor="end"
                className="fill-muted font-mono text-[11px]"
              >
                {formatShortCurrency(tick)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#balance-area)" />
        <path
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />

        {hoveredPoint && (
          <line
            x1={hoveredPoint.x}
            x2={hoveredPoint.x}
            y1={padding.top}
            y2={padding.top + chartHeight}
            stroke="var(--border-strong)"
            strokeWidth="1"
            strokeDasharray="3 4"
            pointerEvents="none"
          />
        )}

        {chartPoints.map((point, index) => {
          const active = hoveredIndex === index;
          const isLatest = index === chartPoints.length - 1;
          const radius = active ? 5.5 : isLatest ? 4 : 3;

          return (
            <g key={`${point.date}-${index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r={14}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                aria-label={`${formatChartDate(point.date)}: ${formatCurrency(point.balance)}`}
              />
              <circle
                cx={point.x}
                cy={point.y}
                r={radius}
                fill={active ? stroke : "var(--background)"}
                fillOpacity={active ? 0.18 : 1}
                stroke={stroke}
                strokeWidth={active ? 2.5 : 2}
                pointerEvents="none"
              />
            </g>
          );
        })}

        <text
          x={padding.left}
          y={height - 14}
          textAnchor="start"
          className="fill-muted text-[11px]"
        >
          {formatChartDate(first.date)}
        </text>
        <text
          x={width - padding.right}
          y={height - 14}
          textAnchor="end"
          className="fill-muted text-[11px]"
        >
          {formatChartDate(latest.date)}
        </text>
      </svg>

      {hoveredPoint && (
        <ChartNodeTooltip
          point={hoveredPoint}
          chartWidth={width}
          chartHeight={height}
        />
      )}
    </div>
  );
}

type ChartPoint = BalancePoint & { x: number; y: number };

function ChartNodeTooltip({
  point,
  chartWidth,
  chartHeight,
}: {
  point: ChartPoint;
  chartWidth: number;
  chartHeight: number;
}) {
  const leftPct = (point.x / chartWidth) * 100;
  const topPct = (point.y / chartHeight) * 100;
  const nearLeft = leftPct < 14;
  const nearRight = leftPct > 86;
  const nearTop = topPct < 22;

  return (
    <div
      className={`pointer-events-none absolute z-10 rounded-md border border-border bg-panel px-3 py-2 shadow-lg ${
        nearTop ? "translate-y-3" : "-translate-y-[calc(100%+12px)]"
      } ${nearLeft ? "translate-x-0" : nearRight ? "-translate-x-full" : "-translate-x-1/2"}`}
      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
    >
      <p className="text-[11px] text-muted">{formatChartDate(point.date)}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold">
        {formatCurrency(point.balance)}
      </p>
    </div>
  );
}

function filterPointsForRange(points: BalancePoint[], range: TimeRangeKey) {
  if (points.length <= 1 || range === "all") return points;

  const option = TIME_RANGES.find((item) => item.key === range);
  if (!option?.days) return points;

  const cutoff = Date.now() - option.days * 24 * 60 * 60 * 1000;
  const sorted = [...points].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const withinRange = sorted.filter((point) => new Date(point.date).getTime() >= cutoff);
  const previousPoint = [...sorted]
    .reverse()
    .find((point) => new Date(point.date).getTime() < cutoff);

  if (!previousPoint) return withinRange.length > 0 ? withinRange : sorted;

  return [
    {
      date: new Date(cutoff).toISOString(),
      balance: previousPoint.balance,
    },
    ...withinRange,
  ];
}

function ChartMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 break-words font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}

function formatSignedCurrency(amount: number) {
  return `${amount >= 0 ? "+" : ""}${formatCurrency(amount)}`;
}

function formatShortCurrency(amount: number) {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  }

  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}K`;
  }

  return `${sign}$${abs.toFixed(0)}`;
}

function formatChartDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";
  return chartDateFormatter.format(date);
}
