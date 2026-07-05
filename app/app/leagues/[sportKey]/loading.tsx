export default function Loading() {
  return (
    <div className="page-enter animate-pulse">
      <div className="mb-5 h-5 w-24 rounded bg-panel-hover/80" />
      <div className="mb-8">
        <div className="h-8 w-72 max-w-full rounded bg-panel-hover" />
        <div className="mt-3 h-4 w-56 rounded bg-panel-hover/80" />
      </div>

      <div className="mb-4 h-4 w-40 rounded bg-panel-hover/80" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card min-h-64">
            <div className="mb-5 flex items-center justify-between">
              <div className="h-3 w-32 rounded bg-panel-hover" />
              <div className="h-5 w-20 rounded-full bg-primary/15" />
            </div>
            <div className="space-y-4">
              <div className="h-9 rounded bg-background/80" />
              <div className="h-9 rounded bg-background/80" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2">
              <div className="h-14 rounded bg-background/80" />
              <div className="h-14 rounded bg-background/80" />
              <div className="h-14 rounded bg-background/80" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
