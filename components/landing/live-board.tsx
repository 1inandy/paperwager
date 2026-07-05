"use client";

import { useRef } from "react";
import { TeamMatchup } from "@/components/team-logo";
import { gsap, useGSAP, prefersReducedMotion } from "./gsap";
import { RollingNumber } from "./rolling-number";
import { boardRows } from "./content";

export function LiveBoard() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".board-row", {
        opacity: 0,
        x: -24,
        stagger: 0.08,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
    },
    { scope: root },
  );

  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Live board</p>
          <h2 className="font-display text-3xl uppercase tracking-tight sm:text-5xl">
            The line moves. You don&apos;t pay for it.
          </h2>
        </div>
        <span className="badge-live shrink-0">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" />
          live
        </span>
      </div>

      <div ref={root} className="overflow-hidden rounded-md border border-border bg-panel/40">
        <div className="grid grid-cols-[64px_1fr_auto_auto] gap-4 border-b border-border px-4 py-3 text-[11px] uppercase tracking-widest text-muted sm:grid-cols-[80px_1fr_auto_auto]">
          <span>League</span>
          <span>Matchup</span>
          <span className="text-right">Decimal</span>
          <span className="text-right">American</span>
        </div>
        {boardRows.map((row) => (
          <div
            key={`${row.home}-${row.away}`}
            data-cursor
            className="board-row grid grid-cols-[64px_1fr_auto_auto] items-center gap-4 border-b border-border/60 px-4 py-4 transition-colors last:border-0 hover:bg-panel-hover sm:grid-cols-[80px_1fr_auto_auto]"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">
              {row.league}
            </span>
            <TeamMatchup
              awayTeam={row.away}
              homeTeam={row.home}
              awayAbbr={row.awayAbbr}
              homeAbbr={row.homeAbbr}
              size="sm"
              layout="horizontal"
            />
            <RollingNumber
              value={row.odds}
              decimals={2}
              onScroll
              className="text-right text-sm font-semibold text-primary"
            />
            <span
              className={`tnum text-right text-sm font-semibold ${
                row.line.startsWith("+") ? "text-primary" : "text-danger"
              }`}
            >
              {row.line}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
