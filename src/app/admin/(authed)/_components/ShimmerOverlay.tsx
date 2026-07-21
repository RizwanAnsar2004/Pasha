"use client";

// Subtle "loading" affordance for admin lists during a server transition.
export function ShimmerOverlay({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={
        "pointer-events-none absolute inset-0 z-10 transition-opacity duration-200 " +
        (active ? "opacity-100" : "opacity-0")
      }
    >
      <div className="absolute inset-0 bg-pasha-stone/30" />
      <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden">
        <div className="admin-shimmer-bar h-full w-1/3 bg-pasha-red/80" />
      </div>
      <style jsx>{`
        @keyframes adminShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .admin-shimmer-bar {
          animation: adminShimmer 1.1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
