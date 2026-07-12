export function Kicker({
  children,
  tone = "dark",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 font-mono text-sm font-bold uppercase tracking-[2.5px] ${
        tone === "light" ? "text-white/60" : "text-pasha-ink/55"
      } ${className}`}
    >
      <span
        aria-hidden
        className={`h-[2px] w-[34px] rounded-full ${tone === "light" ? "bg-white/40" : "bg-pasha-red"}`}
      />
      {children}
    </span>
  );
}
