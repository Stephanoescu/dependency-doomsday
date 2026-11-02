import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cachedForecast, depsKey, imageHeadline, summaryFor, TIMED_OUT, withDeadline } from "./forecast";

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
        finding: { kind: "critical", name: "left-pad", downloads: 2_000_000 },
      }),
    });

    calls.length = 0;
    expect(await summaryFor(source)).toEqual(first);
    expect(calls).toEqual([]);
  });

  it("words image headlines in the third person, with the project's name", async () => {
    const repo = await summaryFor({ kind: "repo", ref: { owner: "acme", repo: "shop" }, includeDev: false });
    const list = await summaryFor({ kind: "list", list: { dependencies: ["left-pad"], devDependencies: [] } });
    if (!repo.ok || !list.ok) throw new Error("expected summaries");
    expect(imageHeadline(repo.summary)).toBe(
      "acme/shop: its most critical dependency (**left-pad**, 2M downloads/month) has **a single npm maintainer**.",
    );
    expect(imageHeadline(list.summary)).toBe(
      "This project: its most critical dependency (**left-pad**, 2M downloads/month) has **a single npm maintainer**.",
    );
  });

  it("serves the full result from cache only, for server-rendered share links", async () => {
    const source = { kind: "repo" as const, ref: { owner: "acme", repo: "shop" }, includeDev: false };
    expect(await cachedForecast(source)).toBeNull();
    expect(calls).toEqual([]);

    await summaryFor(source);
    calls.length = 0;
    const cached = await cachedForecast(source);
    expect(cached?.parsed).toMatchObject({ ok: true, projectName: "shop", ref: source.ref, truncated: 0 });
    expect(cached?.analysis.packages.map((p) => p.name)).toEqual(["left-pad"]);
    expect(calls).toEqual([]);
  });

  it("doesn't cache summaries that are missing GitHub data", async () => {
    vi.stubGlobal("fetch", async (input: string) => {
      const url = new URL(input);
      calls.push(`${url.host}${url.pathname}`);
      if (url.pathname === "/rate_limit") {
        return Response.json({ resources: { core: { limit: 60, remaining: 0, reset: 2_000_000_000 } } });
      }
      if (url.host === "registry.npmjs.org") {
        return Response.json({
          "dist-tags": { latest: "1.0.0" },
          maintainers: [{ name: "solo" }],
          time: { "1.0.0": new Date().toISOString() },
          versions: { "1.0.0": {} },
          repository: "github:acme/x",
        });
      }
      if (url.host === "api.npmjs.org") return Response.json({ downloads: 1, package: "x" });
      return new Response("nope", { status: 404 });
    });
    const source = { kind: "list" as const, list: { dependencies: ["x"], devDependencies: [] } };
    expect((await summaryFor(source)).ok).toBe(true);
    expect(await cachedForecast(source)).toBeNull();
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
