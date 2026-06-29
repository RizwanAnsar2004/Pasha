// Shared helpers for offset-based pagination on admin listing endpoints.
//
// Conventions:
//   - Query params: ?page=1&pageSize=50  (1-indexed)
//   - Response shape: { rows, total, page, pageSize }
//   - pageSize is clamped to [1, MAX_PAGE_SIZE] so a hostile client can't
//     ask for the entire table.

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 200;

export type Pagination = {
  page: number;
  pageSize: number;
  from: number;
  to: number;
};

function toInt(v: string | null, fallback: number): number {
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function parsePagination(
  input: URL | URLSearchParams | Record<string, string | string[] | undefined>,
  opts: { defaultPageSize?: number } = {}
): Pagination {
  const defaultSize = opts.defaultPageSize ?? DEFAULT_PAGE_SIZE;

  let pageStr: string | null = null;
  let sizeStr: string | null = null;
  if (input instanceof URL) {
    pageStr = input.searchParams.get("page");
    sizeStr = input.searchParams.get("pageSize");
  } else if (input instanceof URLSearchParams) {
    pageStr = input.get("page");
    sizeStr = input.get("pageSize");
  } else {
    const pickOne = (k: string) => {
      const v = input[k];
      return Array.isArray(v) ? v[0] ?? null : v ?? null;
    };
    pageStr = pickOne("page");
    sizeStr = pickOne("pageSize");
  }

  const page = Math.max(1, toInt(pageStr, 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, toInt(sizeStr, defaultSize)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { page, pageSize, from, to };
}

export type Paginated<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
};
