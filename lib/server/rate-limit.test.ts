import { describe, expect, it, vi } from "vitest";
import { clientIp, MemoryRateLimitStore, rateLimit, rateLimitHeaders, type RateLimitStore } from "./rate-limit";

function clock(start = 1_000_000) {
  let now = start;
  return { now: () => now, advance: (ms: number) => (now += ms) };
}

describe("rateLimit", () => {
  it("allows 10 analyses per minute per IP, then blocks until the window resets", async () => {
    const c = clock();
    const store = new MemoryRateLimitStore(c.now);
    for (let i = 0; i < 10; i++) expect((await rateLimit("analyze", "1.1.1.1", store)).ok).toBe(true);

    const blocked = await rateLimit("analyze", "1.1.1.1", store);
    expect(blocked).toMatchObject({ ok: false, remaining: 0, retryAfter: 60 });

    c.advance(45_000);
    expect((await rateLimit("analyze", "1.1.1.1", store)).retryAfter).toBe(15);

    c.advance(15_000);
    expect(await rateLimit("analyze", "1.1.1.1", store)).toMatchObject({ ok: true, remaining: 9 });
  });

  it("counts IPs and limits separately", async () => {
    const store = new MemoryRateLimitStore(clock().now);
    for (let i = 0; i < 10; i++) await rateLimit("analyze", "1.1.1.1", store);
    expect((await rateLimit("analyze", "2.2.2.2", store)).ok).toBe(true);
    expect((await rateLimit("resolve", "1.1.1.1", store)).ok).toBe(true);
  });

  it("fails open when the store is down", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const broken: RateLimitStore = { hit: () => Promise.reject(new Error("down")) };
    expect((await rateLimit("analyze", "1.1.1.1", broken)).ok).toBe(true);
    vi.restoreAllMocks();
  });

  it("never grows past its key budget", async () => {
    const c = clock();
    const store = new MemoryRateLimitStore(c.now, 3);
    for (const ip of ["a", "b", "c", "d", "e"]) await rateLimit("analyze", ip, store);
    // Oldest windows were evicted; a fresh one starts for "a".
    expect(await rateLimit("analyze", "a", store)).toMatchObject({ remaining: 9 });
  });
});

describe("clientIp", () => {
  const req = (headers: Record<string, string>) => new Request("https://x.test", { headers });

  it("takes the first x-forwarded-for entry, then x-real-ip", () => {
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(req({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(req({}))).toBe("unknown");
  });
});

describe("rateLimitHeaders", () => {
  it("adds Retry-After only when blocked", () => {
    expect(rateLimitHeaders({ ok: true, limit: 10, remaining: 3, retryAfter: 20 })).toEqual({
      "RateLimit-Limit": "10",
      "RateLimit-Remaining": "3",
    });
    expect(rateLimitHeaders({ ok: false, limit: 10, remaining: 0, retryAfter: 20 })["Retry-After"]).toBe("20");
  });
});
