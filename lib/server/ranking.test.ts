import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RankingProject } from "@/lib/ranking";
import { advanceRanking, getRankingSnapshot } from "./ranking";

const projects: RankingProject[] = ["a", "b", "c", "d", "e"].map((id) => ({
  id,
  ref: { owner: "acme", repo: id },
  category: "library",
}));

beforeEach(() => {
  delete (globalThis as { __doomsdayCache?: unknown }).__doomsdayCache;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", async (input: string) => {
    const url = new URL(input);
    if (url.host === "raw.githubusercontent.com") {
      const repo = url.pathname.split("/")[2];
      if (repo === "e") return new Response("missing", { status: 404 });
      return Response.json({ name: repo, dependencies: { [`dep-${repo}`]: "1" } });
    }
    if (url.host === "registry.npmjs.org") {
      return Response.json({
        "dist-tags": { latest: "1.0.0" },
        maintainers: [{ name: "solo" }],
        time: { "1.0.0": new Date().toISOString() },
        versions: { "1.0.0": {} },
      });
    }
    if (url.host === "api.npmjs.org") return Response.json({ downloads: 10, package: "x" });
    if (url.pathname === "/rate_limit") {
      return Response.json({ resources: { core: { limit: 60, remaining: 60, reset: 2_000_000_000 } } });
    }
    return new Response("not found", { status: 404 });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** A clock that returns the given times in order, then keeps the last one. */
function clock(...times: number[]) {
  let i = 0;
  return () => times[Math.min(i++, times.length - 1)];
}

describe("advanceRanking", () => {
  it("stops starting waves when the budget runs out, then resumes where it left off", async () => {
    // start=0, check before wave 1 = 0, check before wave 2 = 31 s (over budget), elapsed = 31 s.
    const first = await advanceRanking({ budgetMs: 30_000, projects, now: clock(0, 0, 31_000) });
    expect(first).toMatchObject({ done: false, processed: ["a", "b", "c"], remaining: ["d", "e"], elapsedMs: 31_000 });
    expect(await getRankingSnapshot()).toBeNull();

    const second = await advanceRanking({ budgetMs: 30_000, projects, now: clock(0) });
    expect(second).toMatchObject({ done: true, processed: ["d", "e"], remaining: [] });

    const snapshot = await getRankingSnapshot();
    expect(snapshot?.entries.map((e) => e.id).sort()).toEqual(["a", "b", "c", "d"]);
    expect(snapshot?.failed).toEqual(["e"]);
    expect(snapshot?.heroes[0]).toMatchObject({ user: "solo", projects: ["acme/a", "acme/b", "acme/c", "acme/d"] });
  });

  it("keeps the previous entry of a project that fails later", async () => {
    await advanceRanking({ budgetMs: 30_000, projects: projects.slice(0, 2), now: clock(0) });
    vi.stubGlobal("fetch", async () => new Response("down", { status: 503 }));
    await advanceRanking({ budgetMs: 30_000, projects: projects.slice(0, 2), now: clock(0) });
    const snapshot = await getRankingSnapshot();
    expect(snapshot?.entries.map((e) => e.id).sort()).toEqual(["a", "b"]);
    expect(snapshot?.failed).toEqual([]);
  });

  it("starts over after publishing", async () => {
    await advanceRanking({ budgetMs: 30_000, projects, now: clock(0) });
    const again = await advanceRanking({ budgetMs: 30_000, projects, now: clock(0) });
    expect(again.processed).toEqual(["a", "b", "c", "d", "e"]);
  });
});
