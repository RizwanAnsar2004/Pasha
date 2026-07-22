export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly data: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Options = { signal?: AbortSignal; headers?: Record<string, string> };

// One request path for every client → /api call: JSON in, JSON out, ApiError on failure.
async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  opts: Options = {},
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? opts.headers : { "Content-Type": "application/json", ...opts.headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: opts.signal,
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = typeof data.error === "string" ? data.error : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}

// Multipart upload: FormData body, no JSON headers, same ApiError contract.
async function upload<T = unknown>(path: string, form: FormData, opts: Options = {}): Promise<T> {
  const res = await fetch(path, { method: "POST", body: form, signal: opts.signal, headers: opts.headers, cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = typeof data.error === "string" ? data.error : `Upload failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}

export const api = {
  get: <T = unknown>(path: string, opts?: Options) => request<T>("GET", path, undefined, opts),
  post: <T = unknown>(path: string, body?: unknown, opts?: Options) => request<T>("POST", path, body, opts),
  patch: <T = unknown>(path: string, body?: unknown, opts?: Options) => request<T>("PATCH", path, body, opts),
  put: <T = unknown>(path: string, body?: unknown, opts?: Options) => request<T>("PUT", path, body, opts),
  del: <T = unknown>(path: string, body?: unknown, opts?: Options) => request<T>("DELETE", path, body, opts),
  upload,
};

// Narrows an unknown catch value to a human-readable message.
export function apiErrorMessage(e: unknown, fallback = "Something went wrong"): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return fallback;
}
