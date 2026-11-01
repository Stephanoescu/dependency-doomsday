import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
}

export interface RateLimitStore {
  /** Increments the counter for `key` and returns its value and the window's remaining ms. */
  hit(key: string, windowMs: number): Promise<{ count: number; resetInMs: number }>;
}

/** Per-instance counters. On serverless every warm instance counts on its own. */
export class MemoryRateLimitStore implements RateLimitStore {
  private windows = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly maxKeys = 10_000,
  ) {}

  async hit(key: string, windowMs: number) {
    const now = this.now();
    let entry = this.windows.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      if (this.windows.size >= this.maxKeys) this.sweep(now);
    }
    entry.count++;
    this.windows.set(key, entry);
    return { count: entry.count, resetInMs: entry.resetAt - now };
  }

  private sweep(now: number) {
    for (const [key, entry] of this.windows) if (entry.resetAt <= now) this.windows.delete(key);
    // Still full of live windows: drop the oldest rather than grow without bound.
    while (this.windows.size >= this.maxKeys) {
      const oldest = this.windows.keys().next().value;
      if (oldest === undefined) break;
      this.windows.delete(oldest);
    }
  }
}

/** Shared counters across instances: INCR + PEXPIRE on the first hit of a window. */
class UpstashRateLimitStore implements RateLimitStore {
  constructor(private readonly redis: Redis) {}

  async hit(key: string, windowMs: number) {
    const [count, ttl] = await this.redis
      .pipeline()
      .incr(key)
      .pexpire(key, windowMs, "NX")
      .pttl(key)
      .exec<[number, number, number]>();
    return { count, resetInMs: ttl > 0 ? ttl : windowMs };
  }
}

const globalForLimiter = globalThis as unknown as { __doomsdayRateLimit?: RateLimitStore };

function getStore(): RateLimitStore {
  if (!globalForLimiter.__doomsdayRateLimit) {
    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    globalForLimiter.__doomsdayRateLimit =
      url && token ? new UpstashRateLimitStore(new Redis({ url, token })) : new MemoryRateLimitStore();
  }
  return globalForLimiter.__doomsdayRateLimit;
}

export const LIMITS = {
  /** Each analysis can spend GitHub quota on up to 150 repos. */
  analyze: { limit: 10, windowMs: 60_000 },
  /** Resolving a missing repo costs one GitHub API call. */
  resolve: { limit: 30, windowMs: 60_000 },
  /** Images and badges may trigger an analysis; crawlers retry, so be generous. */
  image: { limit: 30, windowMs: 60_000 },
} as const;

export type LimitName = keyof typeof LIMITS;

/** Fixed-window limit per client IP. Fails open if the store errors. */
export async function rateLimit(
  name: LimitName,
  ip: string,
  store: RateLimitStore = getStore(),
): Promise<RateLimitResult> {
  const { limit, windowMs } = LIMITS[name];
  try {
    const { count, resetInMs } = await store.hit(`dd:rl:${name}:${ip}`, windowMs);
    return {
      ok: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      retryAfter: Math.max(1, Math.ceil(resetInMs / 1000)),
    };
  } catch (error) {
    console.warn("[rate-limit] store failed, allowing request:", error);
    return { ok: true, limit, remaining: limit, retryAfter: 0 };
  }
}

/** Client IP behind Vercel's (or any) proxy: first x-forwarded-for entry, then x-real-ip. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    ...(result.ok ? {} : { "Retry-After": String(result.retryAfter) }),
  };
}
