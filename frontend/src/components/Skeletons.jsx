export function TableSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-md bg-surface-raised" />
        <div className="h-4 w-32 rounded-md bg-surface-raised" />
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-b-0"
          >
            <div className="h-3 w-5 rounded bg-surface-hover" />
            <div className="h-3 w-28 rounded bg-surface-hover" />
            <div className="h-3 w-40 rounded bg-surface-hover" />
            <div className="h-3 w-12 rounded bg-surface-hover ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TemplateSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-md bg-surface-raised" />
        <div className="h-4 w-24 rounded-md bg-surface-raised" />
      </div>
      <div className="rounded-xl border border-border bg-surface-raised overflow-hidden">
        <div className="px-5 py-4 border-b border-border space-y-2">
          <div className="h-3 w-48 rounded bg-surface-hover" />
          <div className="h-4 w-64 rounded bg-surface-hover" />
        </div>
        <div className="px-5 py-5 space-y-2">
          <div className="h-3 w-full rounded bg-surface-hover" />
          <div className="h-3 w-5/6 rounded bg-surface-hover" />
          <div className="h-3 w-4/6 rounded bg-surface-hover" />
          <div className="h-3 w-3/4 rounded bg-surface-hover" />
        </div>
      </div>
    </div>
  );
}
