import { Redis } from "@upstash/redis";

const HOUR = 3_600;

export const TTL = {
  /** Data that exists: 24 hours. */
  data: 24 * HOUR,
  /** "Not found" answers: shorter, a package or repo may appear later. */
  missing: 6 * HOUR,
} as const;

/** Bump the version to invalidate every cached entry after a shape change. */
const PREFIX = "dd:v3:";

export const cacheKey = {
  npm: (name: string) => `${PREFIX}npm:${name}`,
  downloads: (name: string) => `${PREFIX}dl:${name}`,
  github: (owner: string, repo: string) => `${PREFIX}gh:${owner}/${repo}`.toLowerCase(),
};

export interface CacheWrite {
  key: string;
  value: unknown;
  ttl: number;
}

export interface Cache {
  readonly kind: "memory" | "upstash";
  /** `undefined` means a miss; a stored `null` comes back as `null`. */
  getMany<T>(keys: string[]): Promise<(T | undefined)[]>;
  setMany(writes: CacheWrite[]): Promise<void>;
}

/** In-memory LRU with per-entry TTL. Map iteration order doubles as recency order. */
export class MemoryCache implements Cache {
  readonly kind = "memory";
  private store = new Map<string, { value: unknown; expiresAt: number }>();

  constructor(
    private readonly maxEntries = 5_000,
    private readonly now: () => number = Date.now,
  ) {}

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    this.store.delete(key);
    if (entry.expiresAt <= this.now()) return undefined;
    this.store.set(key, entry);
    return entry.value as T;
  }

  set(key: string, value: unknown, ttl: number): void {
    this.store.delete(key);
    this.store.set(key, { value, expiresAt: this.now() + ttl * 1_000 });
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) break;
      this.store.delete(oldest);
    }
  }

  get size(): number {
    return this.store.size;
  }

  async getMany<T>(keys: string[]): Promise<(T | undefined)[]> {
    return keys.map((key) => this.get<T>(key));
  }

  async setMany(writes: CacheWrite[]): Promise<void> {
    for (const { key, value, ttl } of writes) this.set(key, value, ttl);
  }
}

/**
 * Upstash Redis over REST. Values are wrapped as { v } so a cached `null`
 * ("not found") is distinguishable from a miss. Failures degrade to misses.
 */
class UpstashCache implements Cache {
  readonly kind = "upstash";

  constructor(private readonly redis: Redis) {}

  async getMany<T>(keys: string[]): Promise<(T | undefined)[]> {
    if (keys.length === 0) return [];
    try {
      const values = await this.redis.mget<({ v: T } | null)[]>(...keys);
      return values.map((entry) =>
        entry && typeof entry === "object" && "v" in entry ? entry.v : undefined,
      );
    } catch (error) {
      console.warn("[cache] Upstash read failed, treating as miss:", error);
      return keys.map(() => undefined);
    }
  }

  async setMany(writes: CacheWrite[]): Promise<void> {
    if (writes.length === 0) return;
    try {
      const pipeline = this.redis.pipeline();
      for (const { key, value, ttl } of writes) pipeline.set(key, { v: value }, { ex: ttl });
      await pipeline.exec();
    } catch (error) {
      console.warn("[cache] Upstash write failed:", error);
    }
  }
}

/** Memory in front of Upstash, so warm serverless instances skip the round-trip. */
class LayeredCache implements Cache {
  readonly kind = "upstash";
  private static readonly L1_TTL = HOUR;

  constructor(
    private readonly l1: MemoryCache,
    private readonly l2: Cache,
  ) {}

  async getMany<T>(keys: string[]): Promise<(T | undefined)[]> {
    const values = keys.map((key) => this.l1.get<T>(key));
    const missing = keys.filter((_, i) => values[i] === undefined);
    if (missing.length === 0) return values;

    const remote = await this.l2.getMany<T>(missing);
    let j = 0;
    for (let i = 0; i < keys.length; i++) {
      if (values[i] !== undefined) continue;
      const value = remote[j++];
      values[i] = value;
      if (value !== undefined) this.l1.set(keys[i], value, LayeredCache.L1_TTL);
    }
    return values;
  }

  async setMany(writes: CacheWrite[]): Promise<void> {
    for (const { key, value, ttl } of writes) {
      this.l1.set(key, value, Math.min(ttl, LayeredCache.L1_TTL));
    }
    await this.l2.setMany(writes);
  }
}

// Survives Next.js dev hot reloads.
const globalForCache = globalThis as unknown as { __doomsdayCache?: Cache };

/** Upstash when both env vars are set, otherwise an in-memory LRU. */
export function getCache(): Cache {
  if (!globalForCache.__doomsdayCache) {
    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    globalForCache.__doomsdayCache =
      url && token
        ? new LayeredCache(new MemoryCache(1_000), new UpstashCache(new Redis({ url, token })))
        : new MemoryCache();
  }
  return globalForCache.__doomsdayCache;
}
