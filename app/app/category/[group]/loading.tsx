export default function Loading() {
  return (
    <div className="page-enter animate-pulse">
      <div className="mb-5 h-5 w-24 rounded bg-panel-hover/80" />

      <section className="relative -mx-4 overflow-hidden border-y border-border bg-panel/45 px-4 py-7 sm:mx-0 sm:px-6">
        <span aria-hidden className="terminal-grid absolute inset-0 opacity-70" />
        <div className="relative flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="h-16 w-16 shrink-0 rounded-xl border border-border-strong bg-background/80 sm:h-20 sm:w-20" />
            <div className="min-w-0 flex-1">
              <div className="mb-3 h-3 w-24 rounded bg-primary/25" />
              <div className="h-9 w-64 max-w-full rounded bg-panel-hover" />
              <div className="mt-4 h-4 w-80 max-w-full rounded bg-panel-hover/80" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-14 w-20 rounded bg-panel-hover/80" />
            <div className="h-14 w-20 rounded bg-panel-hover/80" />
            <div className="h-14 w-20 rounded bg-panel-hover/80" />
          </div>
        </div>
      </section>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="min-h-28 rounded-lg border border-border bg-panel/70 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-background/80" />
              <div className="flex-1">
                <div className="h-4 w-2/3 rounded bg-panel-hover" />
                <div className="mt-3 h-3 w-20 rounded bg-panel-hover/80" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
