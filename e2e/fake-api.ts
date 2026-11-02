import type { Page } from "@playwright/test";
import type { AnalysisEvent, PackageData } from "@/lib/analysis/types";
import type { Dependency } from "@/lib/input/types";
import { forecast } from "@/lib/risk";

const NOW = Date.parse("2026-11-01T00:00:00Z");

/** npm answers 404 for these, as it does for private packages. */
const NOT_ON_NPM = /^@empresa-falsa\//;
/** npm times out for these. */
const NPM_DOWN = /^flaky-/;

function fakePackage({ name, field }: Dependency): PackageData {
  const base = { name, field, downloadsStatus: "ok" as const, downloads: 1_000, githubStatus: "ok" as const };
  if (NOT_ON_NPM.test(name)) return { ...base, npmStatus: "not-found", npm: null, downloadsStatus: "not-found", downloads: null, githubStatus: "no-repo", github: null };
  if (NPM_DOWN.test(name)) return { ...base, npmStatus: "error", npm: null, downloads: null, githubStatus: "no-repo", github: null };
  return {
    ...base,
    npmStatus: "ok",
    npm: {
      name,
      latestVersion: "1.0.0",
      deprecated: null,
      unpublished: false,
      maintainers: ["a", "b"],
      lastPublishAt: "2026-10-01T00:00:00Z",
      createdAt: "2020-01-01T00:00:00Z",
      dependencyCount: 1,
      funding: [],
      repositoryUrl: `https://github.com/acme/${name}`,
      github: { owner: "acme", repo: name },
    },
    github: { fullName: `acme/${name}`, pushedAt: "2026-10-01T00:00:00Z", archived: false, openIssues: 1, stars: 1, ownerType: "Organization" },
  };
}

export const EXPRESS_DEPS = Array.from({ length: 28 }, (_, i) => `express-dep-${i + 1}`);

/**
 * Stands in for /api/resolve (expressjs/express → 28 packages) and
 * /api/analyze (an NDJSON stream with a progress line per package).
 */
export async function fakeApi(page: Page) {
  await page.route("**/api/resolve", (route) =>
    route.fulfill({
      json: {
        ok: true,
        projectName: "express",
        ref: { owner: "expressjs", repo: "express" },
        packages: EXPRESS_DEPS.map((name) => ({ name, field: "dependencies" })),
        skipped: [],
        truncated: 0,
      },
    }),
  );
  await page.route("**/api/analyze", (route) => {
    const { packages } = route.request().postDataJSON() as { packages: Dependency[] };
    const scored = forecast(packages.map(fakePackage), NOW);
    const events: AnalysisEvent[] = [
      { type: "start", total: packages.length },
      ...packages.map((p, i) => ({ type: "progress" as const, done: i + 1, total: packages.length, name: p.name })),
      {
        type: "result",
        result: {
          ...scored,
          github: { authenticated: true, limit: 5000, remaining: 4000, resetAt: null, exhausted: false },
          generatedAt: new Date(NOW).toISOString(),
        },
      },
    ];
    return route.fulfill({
      contentType: "application/x-ndjson",
      body: events.map((e) => JSON.stringify(e)).join("\n") + "\n",
    });
  });
}

export function packageJson(name: string, deps: string[]): string {
  return JSON.stringify({ name, dependencies: Object.fromEntries(deps.map((d) => [d, "^1.0.0"])) }, null, 2);
}
