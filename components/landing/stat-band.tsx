import { RollingNumber } from "./rolling-number";
import { stats } from "./content";

export function StatBand() {
  return (
    <section className="border-y border-border bg-panel/30">
      <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {stats.map((s) => (
          <div key={s.label} className="px-6 py-14 text-center">
            <div className="font-display text-5xl font-semibold tracking-tight text-primary sm:text-6xl">
              <RollingNumber
                value={s.value}
                prefix={s.prefix ?? ""}
                suffix={s.suffix ?? ""}
                onScroll
              />
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
