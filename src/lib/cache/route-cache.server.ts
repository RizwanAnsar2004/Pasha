import "server-only";
import {
  CACHE_TTL,
  entryKey,
  generationKey,
  invalidationTargets,
  querySegments,
  type CacheNamespace,
} from "./keys.server";
import { bumpGeneration, cacheGet, cacheSet, readGeneration } from "./redis.server";

// Generic over the request type so handlers typed against NextRequest wrap without a cast.
export type RouteHandler<TReq extends Request = Request> = (
  req: TReq,
  ctx?: unknown,
) => Promise<Response> | Response;

type CachedPayload = { body: string; contentType: string };

// Auth check a route already owns. Returning a falsy principal means "reject with `error`".
export type CacheGuard = () => Promise<{ error: Response | null } & Record<string, unknown>>;

// Resolves the route's own auth, returning a rejection Response or null to allow.
async function denied(guard: CacheGuard | undefined): Promise<Response | null> {
  if (!guard) return null;
  const result = await guard();
  const principal = Object.entries(result).find(([k]) => k !== "error")?.[1];
  return principal ? null : result.error ?? new Response(null, { status: 401 });
}

// Wraps a GET handler with read-through caching, keyed by filter/sort/page segments.
export function withCache<TReq extends Request = Request>(
  ns: CacheNamespace,
  handler: RouteHandler<TReq>,
  opts: { ttl?: number; guard?: CacheGuard } = {},
): RouteHandler<TReq> {
  const ttl = opts.ttl ?? CACHE_TTL[ns] ?? 60;

  return async (req: TReq, ctx?: unknown): Promise<Response> => {
    const url = new URL(req.url);
    const generation = await readGeneration(generationKey(ns));
    const key = entryKey({
      ns,
      generation,
      query: querySegments(url.searchParams),
    });

    // Reading an entry is harmless; only *serving* it needs authorization. Checking the
    // guard on the hit path alone keeps every request to exactly one auth round-trip —
    // on a miss the handler runs its own `requireAdmin` and 401s before anything is cached.
    const hit = await cacheGet<CachedPayload>(key);
    if (hit) {
      const rejected = await denied(opts.guard);
      if (rejected) return rejected;
      return new Response(hit.body, {
        status: 200,
        headers: { "Content-Type": hit.contentType, "X-Cache": "HIT" },
      });
    }

    const res = await handler(req, ctx);

    // Only 200 JSON is cacheable; errors and 401s must stay live on every request.
    const contentType = res.headers.get("content-type") ?? "application/json";
    if (res.status === 200 && contentType.includes("application/json")) {
      const body = await res.clone().text();
      await cacheSet(key, { body, contentType } satisfies CachedPayload, ttl);
    }

    const out = new Response(res.body, { status: res.status, headers: res.headers });
    out.headers.set("X-Cache", "MISS");
    return out;
  };
}

// Wraps a write handler, dropping the namespace's cache once the write actually succeeds.
export function withInvalidate<TReq extends Request = Request>(
  ns: CacheNamespace,
  handler: RouteHandler<TReq>,
): RouteHandler<TReq> {
  return async (req: TReq, ctx?: unknown): Promise<Response> => {
    const res = await handler(req, ctx);
    if (res.status >= 200 && res.status < 300) await invalidate(ns);
    return res;
  };
}

// Drops every cached entry for a namespace and its dependants, whatever the filters or page.
export async function invalidate(ns: CacheNamespace): Promise<void> {
  await Promise.all(invalidationTargets(ns).map((target) => bumpGeneration(generationKey(target))));
}
