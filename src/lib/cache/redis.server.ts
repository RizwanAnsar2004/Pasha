import "server-only";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const REDIS_ENABLED = process.env.REDIS_DISABLED !== "1";

// Survives Next.js dev hot-reloads; without it every reload leaks a new connection.
const globalForRedis = globalThis as unknown as { __pashaRedis?: Redis | null };

let warned = false;

// Returns the one shared client, or null when caching is off or the socket is unusable.
export function getRedis(): Redis | null {
  if (!REDIS_ENABLED) return null;
  if (globalForRedis.__pashaRedis !== undefined) return globalForRedis.__pashaRedis;

  try {
    const client = new Redis(REDIS_URL, {
      lazyConnect: false,
      // Connect fast — an unreachable server should be written off immediately.
      connectTimeout: 1000,
      // But be patient once connected. Under load the event loop, not Redis, delays the
      // reply; a tight command timeout then turns a warm cache into a MISS storm and sends
      // the traffic to Postgres — the opposite of what the cache is for. Measured at 1000
      // concurrent: a 1s timeout produced 21% false misses on a fully warm cache.
      commandTimeout: 5000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 500, 5000),
    });

    client.on("error", (err) => {
      if (warned) return;
      warned = true;
      console.warn(`[redis] unavailable, serving uncached: ${err.message}`);
    });
    client.on("ready", () => {
      warned = false;
    });

    globalForRedis.__pashaRedis = client;
    return client;
  } catch (err) {
    console.warn(`[redis] init failed, serving uncached: ${(err as Error).message}`);
    globalForRedis.__pashaRedis = null;
    return null;
  }
}

// Runs a Redis command, swallowing failures so cache problems never reach the user.
export async function safeRedis<T>(fn: (client: Redis) => Promise<T>): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    return await fn(client);
  } catch {
    return null;
  }
}

// Reads and parses a JSON entry, treating a corrupt value as a miss.
export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await safeRedis((c) => c.get(key));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// Stores a JSON entry under a TTL safety net.
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await safeRedis((c) => c.set(key, JSON.stringify(value), "EX", Math.max(1, ttlSeconds)));
}

// Deletes explicit keys.
export async function cacheDel(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await safeRedis((c) => c.del(...keys));
}

// Bumps a namespace counter, orphaning every key that embeds it — O(1), no SCAN sweep.
export async function bumpGeneration(generationKey: string): Promise<void> {
  await safeRedis((c) => c.incr(generationKey));
}

// Reads a namespace counter, defaulting to 0 when unset or Redis is down.
export async function readGeneration(generationKey: string): Promise<number> {
  const raw = await safeRedis((c) => c.get(generationKey));
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) ? n : 0;
}
