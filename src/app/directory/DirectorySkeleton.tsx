// Streamed placeholder mirroring the real toolbar + card grid, so nothing jumps.
export function DirectorySkeleton({ cards = 12 }: { cards?: number }) {
  return (
    <div aria-hidden className="animate-pulse">
      {/* Search + filter bar */}
      <div className="rounded-[26px] border border-black/[0.06] bg-white p-5 sm:p-6">
        <div className="h-12 w-full rounded-2xl bg-black/[0.05]" />
        <div className="mt-4 flex flex-wrap gap-3">
          {[180, 140, 140, 120].map((w, i) => (
            <div key={i} className="h-10 rounded-xl bg-black/[0.04]" style={{ width: w }} />
          ))}
        </div>
      </div>

      {/* Result count line */}
      <div className="mt-8 h-4 w-52 rounded bg-black/[0.06]" />

      {/* Card grid */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="rounded-[24px] border border-black/[0.06] bg-white p-6"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-black/[0.06]" />
              <div className="flex-1">
                <div className="h-4 w-3/5 rounded bg-black/[0.07]" />
                <div className="mt-2 h-3 w-2/5 rounded bg-black/[0.04]" />
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <div className="h-3 w-full rounded bg-black/[0.04]" />
              <div className="h-3 w-4/5 rounded bg-black/[0.04]" />
            </div>
            <div className="mt-6 flex gap-2">
              <div className="h-6 w-20 rounded-full bg-black/[0.04]" />
              <div className="h-6 w-16 rounded-full bg-black/[0.04]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
