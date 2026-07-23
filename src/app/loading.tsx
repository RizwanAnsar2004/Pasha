import { Skeleton } from "@/components/ui/Skeleton";

// Baseline route-change skeleton. Next renders this the instant a navigation
// starts, for any segment that doesn't define its own loading.tsx — so the app
// never sits on the previous page with no feedback while the server renders.
export default function Loading() {
  return (
    <div className="flex-1" role="status" aria-label="Loading">
      <div className="site-container py-16 sm:py-20">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-5 h-10 w-3/4 max-w-xl" />
        <Skeleton className="mt-3 h-10 w-1/2 max-w-md" />
        <Skeleton className="mt-6 h-4 w-full max-w-2xl" />
        <Skeleton className="mt-2 h-4 w-5/6 max-w-2xl" />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-pasha-ink/10 p-6">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="mt-5 h-5 w-2/3" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
