"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TeamLogo } from "@/components/team-logo";
import type { FeaturedMatch, HeroSlip, LandingFeed } from "./content";

const STALE_QUEUE_REFRESH_MS = 60_000;
const TIMER_GRACE_MS = 1_500;
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Hero board rendered from the live odds feed (falls back to a labelled sample).
 */
export function HeroBoard({ feed }: { feed: LandingFeed }) {
  const router = useRouter();
  const { matches, slip } = feed;
  const [now, setNow] = useState<number | null>(null);
  const boardMatches = useMemo(() => {
    if (now == null) return matches.slice(0, 3);
    const upcoming = getUpcomingMatches(matches, now);
    return (upcoming.length > 0 ? upcoming : matches).slice(0, 3);
  }, [matches, now]);
  const currentSlip = boardMatches[0] ? slipForMatch(boardMatches[0], slip) : slip;

  useEffect(() => {
    if (now != null) return;
    const hydrationId = window.setTimeout(() => {
      setNow(Date.now());
    }, 0);
    return () => window.clearTimeout(hydrationId);
  }, [now]);

  useEffect(() => {
    if (feed.source !== "live") return;
    if (now == null) return;

    const nextStart = getNextStartTime(matches, now);

    if (!nextStart) {
      const refreshId = window.setTimeout(() => {
        router.refresh();
      }, STALE_QUEUE_REFRESH_MS);
      return () => window.clearTimeout(refreshId);
    }

    const delay = Math.min(
      Math.max(nextStart - now + TIMER_GRACE_MS, TIMER_GRACE_MS),
      MAX_TIMEOUT_MS,
    );

    const timeoutId = window.setTimeout(() => {
      const nextNow = Date.now();
      setNow(nextNow);

      if (getUpcomingMatches(matches, nextNow).length < 3) {
        router.refresh();
      }
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [feed.source, matches, now, router]);

  return (
    <aside className="w-full max-w-5xl">
      <div className="mb-3 flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground">
          <span className="h-2 w-2 rounded-full bg-danger shadow-[0_0_18px_rgba(239,83,80,0.55)]" />
          {feed.source === "live" ? "Live paper board" : "Sample paper board"}
        </span>
        <span className="hidden text-[11px] uppercase tracking-[0.24em] text-foreground/60 sm:inline">
          {feed.source === "live" ? freshnessLabel(feed.updatedAt, now) : "Sample lines"}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_0.9fr]">
        {boardMatches.map((matchup, i) => {
          const selected = i === 0;
          const startsLabel = matchup.startsLabel || "Upcoming";
          return (
            <div
              key={`${matchup.startsAt ?? "sample"}-${matchup.home.code}-${matchup.away.code}-${i}`}
              className={`matchup-tile group relative overflow-hidden rounded-xl border p-3 shadow-xl backdrop-blur-md ${
                selected
                  ? "border-primary/50 bg-background/85"
                  : "border-white/10 bg-background/70"
              }`}
            >
              <div className="matchup-ribbon" />
              <div className="relative">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90">
                    {matchup.league}
                  </span>
                  <span className="tnum text-xs font-semibold text-primary">
                    {matchup.line}
                  </span>
                </div>
                <div className="mb-3 flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.16em] text-muted">
                  <span>Kickoff</span>
                  <time className="tnum text-foreground/80" dateTime={matchup.startsAt ?? undefined}>
                    {startsLabel}
                  </time>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <MatchupSide team={matchup.away} align="left" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                    vs
                  </span>
                  <MatchupSide team={matchup.home} align="right" />
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] uppercase tracking-[0.18em] text-muted">
                  <span>{matchup.market}</span>
                  <span className="tnum text-foreground">{matchup.total}</span>
                </div>
              </div>
            </div>
          );
        })}

        <div className="rounded-xl border border-primary/50 bg-primary p-3 text-background shadow-xl">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em]">
            <span>Paper slip</span>
            <span>{currentSlip.league}</span>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <TeamLogo
                name={currentSlip.pick}
                logoUrl={currentSlip.pickLogoUrl}
                abbreviation={currentSlip.pickAbbr}
                size="md"
              />
              <span className="tnum font-black">{currentSlip.line}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-background/20 pt-3 text-xs uppercase tracking-[0.18em]">
              <span>{currentSlip.market}</span>
              <span>${currentSlip.stake.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em]">
              <span>To win</span>
              <span className="tnum font-black">${currentSlip.toWin.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function getUpcomingMatches(matches: FeaturedMatch[], now: number) {
  return matches.filter((match) => {
    if (!match.startsAt) return true;
    return new Date(match.startsAt).getTime() > now;
  });
}

function getNextStartTime(matches: FeaturedMatch[], now: number) {
  const upcomingStarts = matches
    .map((match) => (match.startsAt ? new Date(match.startsAt).getTime() : null))
    .filter((time): time is number => time != null && time > now)
    .sort((a, b) => a - b);

  return upcomingStarts[0] ?? null;
}

function slipForMatch(match: FeaturedMatch, fallback: HeroSlip): HeroSlip {
  const stake = fallback.stake;
  return {
    league: match.league,
    pick: match.home.name,
    pickLogoUrl: match.home.logoUrl,
    pickAbbr: match.home.code,
    market: match.market,
    line: match.line,
    stake,
    toWin: payoutForAmericanLine(match.line, stake) ?? fallback.toWin,
  };
}

function payoutForAmericanLine(line: string, stake: number) {
  const american = Number(line.replace("+", ""));
  if (!Number.isFinite(american) || american === 0) return null;
  const profit =
    american > 0 ? (stake * american) / 100 : (stake * 100) / Math.abs(american);
  return Math.round(profit);
}

function MatchupSide({
  team,
  align,
}: {
  team: FeaturedMatch["home"];
  align: "left" | "right";
}) {
  return (
    <div className={`flex ${align === "right" ? "justify-end" : "justify-start"}`}>
      <TeamLogo
        name={team.name}
        logoUrl={team.logoUrl}
        abbreviation={team.code}
        size="md"
      />
    </div>
  );
}

function freshnessLabel(updatedAt: string | null, now: number | null): string {
  if (!updatedAt || now == null) return "Live odds";
  const mins = Math.round((now - new Date(updatedAt).getTime()) / 60000);
  if (mins < 1) return "Checked just now";
  if (mins < 60) return `Checked ${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `Checked ${hrs}h ago`;
}
