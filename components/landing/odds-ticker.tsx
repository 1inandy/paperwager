import { tickerOdds, type TickerItem } from "./content";

/**
 * A sportsbook-style marquee strip. Pure CSS animation (duplicated track) so it
 * runs without JS and respects prefers-reduced-motion via the .marquee rule.
 */
export function OddsTicker({ items: source }: { items?: TickerItem[] }) {
  const base: TickerItem[] = source && source.length > 0 ? source : tickerOdds;
  const items = [...base, ...base];

  return (
    <div className="relative overflow-hidden border-y border-border bg-panel/40 py-2.5">
      <div
        className="marquee flex w-max items-center gap-10 whitespace-nowrap"
        style={{ ["--ticker-duration" as string]: "90s" }}
      >
        {items.map((o, i) => (
          <span key={i} className="flex items-center gap-3 text-xs">
            <span className="text-muted">{o.match}</span>
            {o.startsLabel && (
              <span className="tnum text-foreground/60">{o.startsLabel}</span>
            )}
            <span
              className={`tnum ${o.up ? "text-primary" : "text-muted"}`}
            >
              {o.line}
            </span>
            <span className="text-border">/</span>
          </span>
        ))}
      </div>
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}
