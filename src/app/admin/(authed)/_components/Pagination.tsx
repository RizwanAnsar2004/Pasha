"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useListNav } from "./useListNav";

type Props = {
  total: number;
  page: number;
  pageSize: number;
  pageSizeOptions?: number[];
  // Optional: when provided, Pagination uses the parent's nav hook so the
  // parent's isPending flips for page/pageSize changes too. If omitted,
  // Pagination falls back to its own local hook.
  setParams?: (patch: Record<string, string | number | null | undefined>) => void;
  isPending?: boolean;
};

const DEFAULT_OPTIONS = [25, 50, 100, 200];

export function Pagination({
  total,
  page,
  pageSize,
  pageSizeOptions = DEFAULT_OPTIONS,
  setParams,
  isPending,
}: Props) {
  const local = useListNav();
  const push = setParams ?? local.setParams;
  const busy = isPending ?? local.isPending;

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(total, safePage * pageSize);

  const options = useMemo(() => {
    const set = new Set(pageSizeOptions);
    set.add(pageSize);
    return Array.from(set).sort((a, b) => a - b);
  }, [pageSizeOptions, pageSize]);

  const goto = (next: number) => {
    const target = Math.min(Math.max(1, next), totalPages);
    if (target === safePage) return;
    push({ page: target });
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 py-3 border-t border-pasha-line bg-pasha-stone/30 text-xs">
      <div className="flex items-center gap-3 text-pasha-muted">
        <span className="font-mono uppercase tracking-[2px] inline-flex items-center gap-1.5">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          {total === 0 ? "0 of 0" : `${from}–${to} of ${total}`}
        </span>
        <label className="flex items-center gap-1.5">
          <span>Rows</span>
          <select
            value={pageSize}
            onChange={(e) => push({ pageSize: Number(e.target.value), page: 1 })}
            disabled={busy}
            className="h-7 rounded border border-pasha-line bg-white px-1.5 text-xs disabled:opacity-50"
          >
            {options.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => goto(safePage - 1)}
          disabled={safePage <= 1 || busy}
          className="h-8 px-2 inline-flex items-center gap-1 rounded border border-pasha-line bg-white text-pasha-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-pasha-stone/60 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Prev
        </button>
        <span className="px-2 font-mono">
          {safePage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => goto(safePage + 1)}
          disabled={safePage >= totalPages || busy}
          className="h-8 px-2 inline-flex items-center gap-1 rounded border border-pasha-line bg-white text-pasha-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-pasha-stone/60 transition-colors"
        >
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
