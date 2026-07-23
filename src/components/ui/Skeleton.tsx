import { cn } from "@/lib/utils";

// Shared shimmer block for loading.tsx skeletons.
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-pasha-ink/[0.07]", className)}
    />
  );
}
