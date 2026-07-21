import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared presentational bits for the email admin screens.

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-pasha-red/10 text-pasha-red">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-serif text-2xl text-pasha-ink leading-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-pasha-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-pasha-line bg-white/60 px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-pasha-stone text-pasha-muted">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-3 font-medium text-pasha-ink">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-pasha-muted">{hint}</p>}
    </div>
  );
}

export type PillTone = "green" | "amber" | "red" | "slate" | "brand";

const TONE_CLS: Record<PillTone, string> = {
  green: "bg-tier-featured/10 text-tier-featured",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-pasha-red/10 text-pasha-red",
  slate: "bg-pasha-stone text-pasha-muted",
  brand: "bg-pasha-red/10 text-pasha-red",
};

export function Pill({
  label,
  tone = "slate",
  icon: Icon,
}: {
  label: string;
  tone?: PillTone;
  icon?: LucideIcon;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.5px]",
        TONE_CLS[tone]
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  );
}
