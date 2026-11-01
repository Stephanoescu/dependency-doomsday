import { describe, expect, it } from "vitest";
import { cacheKey, MemoryCache } from "./cache";

describe("MemoryCache", () => {
  it("returns stored values, including null, and undefined on a miss", async () => {
    const cache = new MemoryCache();
    await cache.setMany([
      { key: "a", value: { x: 1 }, ttl: 60 },
      { key: "b", value: null, ttl: 60 },
    ]);
    expect(await cache.getMany(["a", "b", "c"])).toEqual([{ x: 1 }, null, undefined]);
  });

  it("expires entries after their TTL", () => {
    let now = 0;
    const cache = new MemoryCache(10, () => now);
    cache.set("a", 1, 60);
    now = 59_999;
    expect(cache.get("a")).toBe(1);
    now = 60_000;
    expect(cache.get("a")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("evicts the least recently used entry when full", () => {
    const cache = new MemoryCache(2);
    cache.set("a", 1, 60);
    cache.set("b", 2, 60);
    cache.get("a"); // a is now the most recent
    cache.set("c", 3, 60);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(1);
    expect(cache.get("c")).toBe(3);
  });
});

describe("cacheKey", () => {
  it("namespaces and versions keys", () => {
    expect(cacheKey.npm("@babel/core")).toBe("dd:v1:npm:@babel/core");
    expect(cacheKey.downloads("react")).toBe("dd:v1:dl:react");
  });

  it("lowercases GitHub keys, since GitHub names are case-insensitive", () => {
    expect(cacheKey.github("Microsoft", "TypeScript")).toBe("dd:v1:gh:microsoft/typescript");
  });
});
