// Small client-side CSV helpers shared by the admin "Export CSV" buttons.
// Every cell is quoted and internal quotes doubled, so commas/newlines in the
// data never break the layout.

// Upper bound used when a list endpoint is asked for "all" rows (export). It
// overrides Supabase's implicit 1000-row cap without an unbounded scan.
export const EXPORT_MAX_ROWS = 100_000;

type RangeResult<T> = {
  data: T[] | null;
  count: number | null;
  error: { message: string } | null;
};

/**
 * Server-side helper: pull every matching row from a Supabase list query in
 * batches, working around PostgREST's per-request `max-rows` cap (1000). The
 * caller supplies a factory that builds a fresh, filtered query for a given
 * range (the query builder can't be reused once awaited). Stops when a short
 * batch is returned or EXPORT_MAX_ROWS is reached.
 */
export async function fetchAllRowsBatched<T>(
  queryForRange: (from: number, to: number) => PromiseLike<RangeResult<T>>,
  batchSize = 1000
): Promise<{ rows: T[]; total: number }> {
  const rows: T[] = [];
  let total = 0;
  let offset = 0;
  for (;;) {
    const { data, count, error } = await queryForRange(offset, offset + batchSize - 1);
    if (error) throw new Error(error.message);
    if (count != null) total = count;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < batchSize || rows.length >= EXPORT_MAX_ROWS) break;
    offset += batchSize;
  }
  return { rows, total };
}

function escapeCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/** Build CSV text from a header row + a 2D array of cells. */
export function toCsv(cols: string[], rows: unknown[][]): string {
  return [cols.map(escapeCell).join(","), ...rows.map((r) => r.map(escapeCell).join(","))].join(
    "\n"
  );
}

/** Trigger a browser download of the given CSV text. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Fetch every row for an admin list endpoint, honoring the filters currently
 * in the page URL. Appends `all=1` so the API skips pagination and returns the
 * full filtered set. Returns the parsed JSON body.
 */
export async function fetchAllForExport(path: string): Promise<Record<string, unknown>> {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  params.set("all", "1");
  params.delete("page");
  params.delete("pageSize");
  const res = await fetch(`${path}?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Could not load the full export.");
  }
  return (await res.json()) as Record<string, unknown>;
}
