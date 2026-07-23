import { Skeleton } from "@/components/ui/Skeleton";

// "View profile" is the slowest common navigation in the app — one row plus its
// related lookups — so it gets a skeleton shaped like the real profile rather
// than the generic one.
export default function Loading() {
  return (
    <div className="flex-1" role="status" aria-label="Loading profile">
      <div className="bg-pasha-ink py-14 sm:py-16">
        <div className="site-container flex items-start gap-6">
          <Skeleton className="h-[74px] w-[74px] shrink-0 rounded-[20px] bg-white/10" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-8 w-2/3 max-w-sm bg-white/10" />
            <Skeleton className="mt-3 h-4 w-full max-w-lg bg-white/10" />
            <div className="mt-5 flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full bg-white/10" />
              <Skeleton className="h-6 w-20 rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      </div>

      <div className="site-container grid gap-10 py-12 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />

          <Skeleton className="mt-10 h-3 w-28" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
