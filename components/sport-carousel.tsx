"use client";

import Link from "next/link";
import { type CSSProperties, useCallback, useState } from "react";
import { SportGroupLogo } from "@/components/entity-logo";

export interface SportCarouselItem {
  group: string;
  href: string;
  leagueCount: number;
  logoUrl: string;
}

interface SportCarouselProps {
  items: SportCarouselItem[];
}

export function SportCarousel({ items }: SportCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeActiveIndex = Math.min(activeIndex, Math.max(items.length - 1, 0));

  const move = useCallback(
    (dir: 1 | -1) => {
      if (items.length <= 1) return;
      setActiveIndex((current) => wrapIndex(current + dir, items.length));
    },
    [items.length],
  );

  if (items.length === 0) return null;

  return (
    <section className="relative mx-auto mt-8 max-w-5xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-10 bottom-14 h-24 rounded-[50%] bg-primary/5 blur-2xl"
      />

      <div className="relative h-[21rem] overflow-hidden sm:h-[25rem] lg:h-[28rem] [perspective:1400px]">
        <ul
          aria-label="Sports categories"
          className="absolute inset-0 [transform-style:preserve-3d]"
        >
          {items.map(({ group, href, leagueCount, logoUrl }, index) => {
            const offset = getLoopedOffset(index, safeActiveIndex, items.length);
            const visible = Math.abs(offset) <= 1;
            const active = offset === 0;

            return (
              <li
                key={group}
                aria-hidden={!visible}
                className="absolute left-1/2 top-1/2 h-64 w-[min(62vw,28rem)] transition-all duration-500 ease-out sm:h-[20rem] sm:w-[min(78vw,28rem)] lg:h-[22rem]"
                style={getSlideStyle(offset)}
              >
                {active ? (
                  <Link
                    href={href}
                    aria-current="true"
                    className={cardClassName(true)}
                    tabIndex={visible ? 0 : -1}
                  >
                    <SportCardContent
                      group={group}
                      leagueCount={leagueCount}
                      logoUrl={logoUrl}
                      active
                    />
                  </Link>
                ) : (
                  <button
                    type="button"
                    aria-label={`Bring ${group} into focus`}
                    onClick={() => setActiveIndex(index)}
                    className={cardClassName(false)}
                    tabIndex={visible ? 0 : -1}
                  >
                    <SportCardContent
                      group={group}
                      leagueCount={leagueCount}
                      logoUrl={logoUrl}
                      active={false}
                    />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

      </div>

      {items.length > 1 && (
        <div className="relative z-40 mx-auto mt-3 flex w-fit items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Previous sport"
            onClick={() => move(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-background/90 text-foreground shadow-lg backdrop-blur transition-all hover:scale-105 hover:border-primary hover:text-primary focus-visible:border-primary focus-visible:outline-none"
          >
            <Chevron dir="left" />
          </button>

          <div className="flex items-center gap-1.5">
            {items.map(({ group }, index) => (
              <button
                key={group}
                type="button"
                aria-label={`Show ${group}`}
                aria-current={index === safeActiveIndex ? "true" : undefined}
                onClick={() => setActiveIndex(index)}
                className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${
                  index === safeActiveIndex
                    ? "w-6 bg-primary"
                    : "w-2 bg-muted/40 hover:bg-muted/70"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            aria-label="Next sport"
            onClick={() => move(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-background/90 text-foreground shadow-lg backdrop-blur transition-all hover:scale-105 hover:border-primary hover:text-primary focus-visible:border-primary focus-visible:outline-none"
          >
            <Chevron dir="right" />
          </button>
        </div>
      )}
    </section>
  );
}

function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

function getLoopedOffset(index: number, activeIndex: number, length: number) {
  const rawOffset = index - activeIndex;
  if (rawOffset > length / 2) return rawOffset - length;
  if (rawOffset < -length / 2) return rawOffset + length;
  return rawOffset;
}

function getSlideStyle(offset: number): CSSProperties {
  if (offset === 0) {
    return {
      filter: "none",
      opacity: 1,
      pointerEvents: "auto",
      transform: "translate3d(-42%, -43%, 80px) scale(1)",
      zIndex: 30,
    };
  }

  if (offset === -1) {
    return {
      filter: "saturate(0.72) brightness(0.66)",
      opacity: 0.58,
      pointerEvents: "auto",
      transform: "translate3d(-94%, -52%, -120px) rotateY(34deg) scale(0.82)",
      zIndex: 20,
    };
  }

  if (offset === 1) {
    return {
      filter: "saturate(0.72) brightness(0.66)",
      opacity: 0.58,
      pointerEvents: "auto",
      transform: "translate3d(22%, -52%, -120px) rotateY(-34deg) scale(0.82)",
      zIndex: 20,
    };
  }

  return {
    filter: "saturate(0.6) brightness(0.45)",
    opacity: 0,
    pointerEvents: "none",
    transform:
      offset < 0
        ? "translate3d(-130%, -54%, -180px) rotateY(42deg) scale(0.68)"
        : "translate3d(44%, -54%, -180px) rotateY(-42deg) scale(0.68)",
    zIndex: 0,
  };
}

function cardClassName(active: boolean) {
  return `group/card relative block h-full w-full overflow-hidden rounded-2xl border text-left transition-all duration-500 focus-visible:outline-none ${
    active
      ? "border-primary/45 bg-panel shadow-[0_0_0_1px_rgba(16,185,129,0.32),0_34px_90px_-42px_rgba(16,185,129,0.68)]"
      : "border-border bg-panel/80 shadow-[0_24px_70px_-46px_rgba(0,0,0,0.95)] hover:border-primary/45"
  }`;
}

function SportCardContent({
  group,
  leagueCount,
  logoUrl,
  active,
}: {
  group: string;
  leagueCount: number;
  logoUrl: string;
  active: boolean;
}) {
  return (
    <>
      <span
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(160deg,var(--panel-hover),var(--panel))]"
      />
      <span
        aria-hidden
        className={`absolute inset-0 bg-[radial-gradient(115%_78%_at_52%_-8%,rgba(16,185,129,0.18),transparent_62%)] transition-opacity duration-500 ${
          active ? "opacity-100" : "opacity-35"
        }`}
      />
      <span aria-hidden className="terminal-grid absolute inset-0 opacity-70" />

      <SportGroupLogo
        group={group}
        logoUrl={logoUrl}
        aria-hidden
        size="xl"
        className={`absolute bottom-4 right-4 opacity-[0.12] transition-all duration-500 group-hover/card:scale-105 group-hover/card:opacity-20 ${
          active ? "h-40 w-40 sm:h-52 sm:w-52" : "h-36 w-36 sm:h-44 sm:w-44"
        }`}
      />

      <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
        <span
          className={`flex items-center justify-center rounded-xl border border-border bg-background/80 shadow-sm transition-colors duration-300 group-hover/card:border-primary/50 ${
            active ? "h-16 w-16" : "h-14 w-14"
          }`}
        >
          <SportGroupLogo
            group={group}
            logoUrl={logoUrl}
            size={active ? "lg" : "md"}
          />
        </span>

        <div>
          <span
            className={`block font-display font-semibold leading-tight tracking-tight text-foreground ${
              active ? "text-xl sm:text-2xl" : "text-lg"
            }`}
          >
            {group}
          </span>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-2.5 py-1 text-[11px] font-medium text-muted transition-colors group-hover/card:border-primary/30 group-hover/card:text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {leagueCount} {leagueCount === 1 ? "league" : "leagues"}
          </span>
        </div>
      </div>
    </>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}
