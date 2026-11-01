import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { depsKey, summaryFor, TIMED_OUT, withDeadline } from "./forecast";

const calls: string[] = [];

beforeEach(() => {
  calls.length = 0;
  delete (globalThis as { __doomsdayCache?: unknown }).__doomsdayCache;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubGlobal("fetch", async (input: string) => {
    const url = new URL(input);
    calls.push(`${url.host}${url.pathname}`);
    if (url.host === "raw.githubusercontent.com") {
      return new Response(JSON.stringify({ name: "shop", dependencies: { "left-pad": "^1" }, devDependencies: { vitest: "1" } }));
    }
    if (url.host === "registry.npmjs.org") {
      return Response.json({
        "dist-tags": { latest: "1.0.0" },
        maintainers: [{ name: "solo" }],
        time: { "1.0.0": new Date().toISOString() },
        versions: { "1.0.0": { deprecated: "use padStart" } },
      });
    }
    if (url.host === "api.npmjs.org") return Response.json({ downloads: 2_000_000, package: "left-pad" });
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

describe("depsKey", () => {
  it("ignores order but not the field", () => {
    const a = depsKey([
      { name: "a", field: "dependencies" },
      { name: "b", field: "dependencies" },
    ]);
    expect(
      depsKey([
        { name: "b", field: "dependencies" },
        { name: "a", field: "dependencies" },
      ]),
    ).toBe(a);
    expect(
      depsKey([
        { name: "a", field: "dependencies" },
        { name: "b", field: "devDependencies" },
      ]),
    ).not.toBe(a);
  });
});

describe("withDeadline", () => {
  it("returns the value in time, or TIMED_OUT", async () => {
    expect(await withDeadline(Promise.resolve(1), 50)).toBe(1);
    expect(await withDeadline(new Promise((r) => setTimeout(() => r(1), 200)), 10)).toBe(TIMED_OUT);
  });
});

describe("summaryFor", () => {
  it("reads the repo, analyzes it and caches the summary", async () => {
    const source = { kind: "repo" as const, ref: { owner: "acme", repo: "shop" }, includeDev: false };
    const first = await summaryFor(source);
    expect(first).toEqual({
      ok: true,
      summary: expect.objectContaining({
        label: "acme/shop",
        state: "scored",
        score: 0,
        minutesToMidnight: 1,
        total: 1,
        critical: 1,
        headline: expect.stringContaining("**left-pad**"),
      }),
    });

    calls.length = 0;
    expect(await summaryFor(source)).toEqual(first);
    expect(calls).toEqual([]);
  });

  it("decodes list sources without touching GitHub", async () => {
    const result = await summaryFor({
      kind: "list",
      list: { projectName: "x", dependencies: ["left-pad"], devDependencies: [] },
    });
    expect(result.ok && result.summary.label).toBe("x");
    expect(calls.some((c) => c.startsWith("raw.githubusercontent.com"))).toBe(false);
  });

  it("reports repo errors", async () => {
    vi.stubGlobal("fetch", async () => new Response("nope", { status: 404 }));
    expect(await summaryFor({ kind: "repo", ref: { owner: "a", repo: "b" }, includeDev: false })).toEqual({
      ok: false,
      error: "repo-not-found",
    });
  });
});
