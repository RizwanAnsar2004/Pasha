import { Skeleton } from "@/components/ui/Skeleton";

// Admin tabs (Submissions, Data Bank, Events…) each run their own query, so
// switching between them has a visible gap. This renders inside the admin
// shell, leaving the sidebar in place.
export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div>
        <Skeleton className="h-7 w-52" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>

      <div className="rounded-2xl border border-pasha-line bg-white p-5">
        <Skeleton className="h-9 w-full max-w-sm rounded-lg" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
