import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Dependency } from "@/lib/input/types";
import { analyzePackages } from "./analyze";

type Handler = (url: URL) => { status: number; body?: unknown; headers?: Record<string, string> };

const calls: string[] = [];
let active = 0;
let peak = 0;
let quota = { limit: 60, remaining: 60, reset: 2_000_000_000 };

function packument(name: string, repo = `https://github.com/acme/${name.replace(/^@.*\//, "")}`) {
  return {
    name,
    "dist-tags": { latest: "1.0.0" },
    maintainers: [{ name: "solo", email: "solo@example.com" }],
    time: { created: "2015-01-01T00:00:00Z", "1.0.0": "2020-01-01T00:00:00Z" },
    versions: { "1.0.0": {} },
    repository: { type: "git", url: `git+${repo}.git` },
  };
}

const defaultHandler: Handler = (url) => {
  if (url.host === "api.github.com" && url.pathname === "/rate_limit") {
    return { status: 200, body: { resources: { core: quota } } };
  }
  if (url.host === "api.github.com") {
    const [, , owner, repo] = url.pathname.split("/");
    quota.remaining--;
    return {
      status: 200,
      body: { full_name: `${owner}/${repo}`, pushed_at: "2024-01-01T00:00:00Z", archived: false, open_issues_count: 3, stargazers_count: 10, owner: { type: "User" } },
      headers: { "x-ratelimit-limit": "60", "x-ratelimit-remaining": String(quota.remaining), "x-ratelimit-reset": String(quota.reset) },
    };
  }
  if (url.host === "api.npmjs.org") {
    const names = decodeURIComponent(url.pathname.split("/last-month/")[1]).split(",");
    if (names.length === 1) return { status: 200, body: { downloads: 1000, package: names[0] } };
    return { status: 200, body: Object.fromEntries(names.map((n) => [n, { downloads: 5000, package: n }])) };
  }
  if (url.host === "registry.npmjs.org") {
    const name = decodeURIComponent(url.pathname.slice(1));
    return { status: 200, body: packument(name) };
  }
  return { status: 500 };
};

let handler: Handler = defaultHandler;

beforeEach(() => {
  calls.length = 0;
  active = 0;
  peak = 0;
  quota = { limit: 60, remaining: 60, reset: 2_000_000_000 };
  handler = defaultHandler;
  delete (globalThis as { __doomsdayCache?: unknown }).__doomsdayCache;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubGlobal("fetch", async (input: string) => {
    const url = new URL(input);
    calls.push(`${url.host}${url.pathname}`);
    active++;
    peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, 2));
    active--;
    const { status, body, headers } = handler(url);
    return new Response(body === undefined ? "oops" : JSON.stringify(body), { status, headers });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const deps = (...names: string[]): Dependency[] => names.map((name) => ({ name, field: "dependencies" }));

describe("analyzePackages", () => {
  it("collects npm, downloads and GitHub data for each package", async () => {
    const progress: number[] = [];
    const result = await analyzePackages(deps("left-pad", "@acme/core"), {
      onProgress: (done) => progress.push(done),
    });

    expect(progress).toEqual([1, 2]);
    expect(result.packages[0]).toMatchObject({
      name: "left-pad",
      npmStatus: "ok",
      npm: { maintainers: ["solo"], lastPublishAt: "2020-01-01T00:00:00.000Z" },
      downloadsStatus: "ok",
      githubStatus: "ok",
      github: { fullName: "acme/left-pad", openIssues: 3 },
    });
    expect(result.packages[1]).toMatchObject({ name: "@acme/core", downloads: 1000 });
    expect(result.github).toMatchObject({ authenticated: false, limit: 60, exhausted: false });
  });

  it("uses the bulk endpoint for unscoped packages and single calls for scoped ones", async () => {
    await analyzePackages(deps("a", "b", "c", "@s/x", "@s/y"));
    const downloadCalls = calls.filter((c) => c.startsWith("api.npmjs.org"));
    expect(downloadCalls).toHaveLength(3);
    expect(downloadCalls).toContain("api.npmjs.org/downloads/point/last-month/a,b,c");
  });

  it("isolates failures: a broken source marks only that package", async () => {
    handler = (url) => {
      if (url.host === "registry.npmjs.org" && url.pathname === "/broken") return { status: 503 };
      if (url.host === "registry.npmjs.org" && url.pathname === "/ghost") return { status: 404, body: { error: "Not found" } };
      if (url.pathname === "/repos/acme/flaky") return { status: 500 };
      return defaultHandler(url);
    };
    const result = await analyzePackages(deps("ok", "broken", "ghost", "flaky"));
    const byName = Object.fromEntries(result.packages.map((p) => [p.name, p]));
    expect(byName.ok).toMatchObject({ npmStatus: "ok", githubStatus: "ok" });
    expect(byName.broken).toMatchObject({ npmStatus: "error", npm: null });
    expect(byName.ghost).toMatchObject({ npmStatus: "not-found", npm: null });
    expect(byName.flaky).toMatchObject({ npmStatus: "ok", githubStatus: "error", github: null });
  });

  it(`never has more than 8 requests in flight`, async () => {
    await analyzePackages(deps(...Array.from({ length: 40 }, (_, i) => `pkg-${i}`)));
    expect(peak).toBeLessThanOrEqual(8);
    expect(peak).toBeGreaterThan(1);
  });

  it("looks up a repo shared by several packages only once", async () => {
    handler = (url) =>
      url.host === "registry.npmjs.org"
        ? { status: 200, body: packument(url.pathname.slice(1), "https://github.com/acme/mono") }
        : defaultHandler(url);
    await analyzePackages(deps("one", "two", "three"));
    expect(calls.filter((c) => c === "api.github.com/repos/acme/mono")).toHaveLength(1);
  });

  it("serves a second analysis from the cache", async () => {
    await analyzePackages(deps("left-pad", "@acme/core"));
    calls.length = 0;
    const result = await analyzePackages(deps("left-pad", "@acme/core"));
    expect(calls).toEqual(["api.github.com/rate_limit"]);
    expect(result.packages[0]).toMatchObject({ npmStatus: "ok", githubStatus: "ok", downloads: 1000 });
  });

  it("does not cache errors", async () => {
    handler = (url) => (url.host === "registry.npmjs.org" ? { status: 503 } : defaultHandler(url));
    await analyzePackages(deps("x"));
    handler = defaultHandler;
    const result = await analyzePackages(deps("x"));
    expect(result.packages[0].npmStatus).toBe("ok");
  });

  it("stops calling GitHub when the hourly quota runs out", async () => {
    quota = { limit: 60, remaining: 2, reset: 2_000_000_000 };
    const result = await analyzePackages(deps("a", "b", "c", "d", "e"));
    const statuses = result.packages.map((p) => p.githubStatus);
    expect(statuses.filter((s) => s === "ok")).toHaveLength(2);
    expect(statuses.filter((s) => s === "rate-limited")).toHaveLength(3);
    expect(calls.filter((c) => c.startsWith("api.github.com/repos"))).toHaveLength(2);
    expect(result.github).toMatchObject({ exhausted: true, remaining: 0 });
  });

  it("treats a 403 rate-limit answer as exhausted", async () => {
    handler = (url) =>
      url.host === "api.github.com" && url.pathname.startsWith("/repos")
        ? { status: 403, body: { message: "API rate limit exceeded" }, headers: { "x-ratelimit-remaining": "0" } }
        : defaultHandler(url);
    const result = await analyzePackages(deps("a", "b"));
    expect(result.packages.every((p) => p.githubStatus === "rate-limited")).toBe(true);
    expect(result.github.exhausted).toBe(true);
  });

  it("marks packages without a repository or with a non-GitHub one", async () => {
    handler = (url) => {
      if (url.pathname === "/norepo") return { status: 200, body: { ...packument("norepo"), repository: undefined } };
      if (url.pathname === "/gitlab") return { status: 200, body: packument("gitlab", "https://gitlab.com/a/b") };
      return defaultHandler(url);
    };
    const result = await analyzePackages(deps("norepo", "gitlab"));
    expect(result.packages.map((p) => p.githubStatus)).toEqual(["no-repo", "not-github"]);
  });
});
