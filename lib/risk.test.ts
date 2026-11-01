import { describe, expect, it } from "vitest";
import type { GitHubRepoInfo, NpmInfo, PackageData } from "@/lib/analysis/types";
import {
  forecast,
  METHODOLOGY_VERSION,
  minutesToMidnight,
  monthsSince,
  packageWeight,
  riskLevel,
  scorePackage,
  summarize,
  type ScoredPackage,
} from "./risk";

const NOW = Date.parse("2026-06-01T00:00:00Z");
const MONTH = (365.25 / 12) * 24 * 3600 * 1000;
const ago = (months: number) => new Date(NOW - months * MONTH).toISOString();

interface Overrides {
  npm?: Partial<NpmInfo>;
  github?: Partial<GitHubRepoInfo> | null;
  downloads?: number | null;
  githubStatus?: PackageData["githubStatus"];
}

/** A healthy package: 3 maintainers, released last month, pushed last week. */
function pkg({ npm, github, downloads = 1_000, githubStatus }: Overrides = {}): PackageData {
  const info: NpmInfo = {
    name: "pkg",
    latestVersion: "1.0.0",
    deprecated: null,
    unpublished: false,
    maintainers: ["a", "b", "c"],
    lastPublishAt: ago(1),
    createdAt: ago(100),
    dependencyCount: 2,
    repositoryUrl: "https://github.com/acme/pkg",
    github: { owner: "acme", repo: "pkg" },
    ...npm,
  };
  const repo: GitHubRepoInfo | null =
    github === null
      ? null
      : {
          fullName: "acme/pkg",
          pushedAt: ago(0.25),
          archived: false,
          openIssues: 40,
          stars: 100,
          ownerType: "Organization",
          ...github,
        };
  return {
    name: info.name,
    field: "dependencies",
    npmStatus: "ok",
    npm: info,
    downloadsStatus: downloads === null ? "error" : "ok",
    downloads,
    githubStatus: githubStatus ?? (repo ? "ok" : "rate-limited"),
    github: repo,
  };
}

const score = (overrides?: Overrides) => scorePackage(pkg(overrides), NOW)!;
const ruleIds = (overrides?: Overrides) => score(overrides).rules.map((r) => r.id);

describe("riskLevel", () => {
  it("is green 0–29, yellow 30–59 and red from 60", () => {
    expect([0, 29, 30, 59, 60, 100].map(riskLevel)).toEqual(["low", "low", "mid", "mid", "high", "high"]);
  });
});

describe("scorePackage", () => {
  it("gives a healthy package zero risk", () => {
    expect(score()).toMatchObject({ risk: 0, level: "low", rules: [], critical: false, npmDataOnly: false });
  });

  it("returns null for packages without npm data", () => {
    expect(scorePackage({ ...pkg(), npmStatus: "error", npm: null }, NOW)).toBeNull();
    expect(scorePackage({ ...pkg(), npmStatus: "not-found", npm: null }, NOW)).toBeNull();
  });

  describe("terminal rules", () => {
    it("deprecated on npm → 100", () => {
      expect(score({ npm: { deprecated: "use something else" } })).toMatchObject({ risk: 100, level: "high" });
    });

    it("archived on GitHub → 100", () => {
      expect(score({ github: { archived: true } }).risk).toBe(100);
    });

    it("unpublished from npm → 100", () => {
      expect(score({ npm: { unpublished: true } }).risk).toBe(100);
    });

    it("caps at 100 but still lists every rule that fired", () => {
      const result = score({
        npm: { deprecated: "x", maintainers: ["solo"], lastPublishAt: ago(50), repositoryUrl: null, github: null },
        github: null,
        githubStatus: "no-repo",
      });
      expect(result.risk).toBe(100);
      expect(result.rules.map((r) => [r.id, r.points])).toEqual([
        ["deprecated", 100],
        ["single-maintainer", 30],
        ["stale-release", 40],
        ["no-repo", 10],
      ]);
    });
  });

  it("single maintainer → +30", () => {
    expect(score({ npm: { maintainers: ["solo"] } }).risk).toBe(30);
    expect(score({ npm: { maintainers: [] } }).risk).toBe(0);
  });

  describe("release age", () => {
    it("over 36 months → +40", () => {
      expect(score({ npm: { lastPublishAt: ago(37) }, github: { pushedAt: ago(13) } }).rules).toEqual([
        { id: "stale-release", points: 40, basePoints: 40, months: 37, halvedBy: [] },
      ]);
    });

    it("over 18 months → +25", () => {
      expect(score({ npm: { lastPublishAt: ago(20) }, github: { pushedAt: ago(13) } }).risk).toBe(25);
    });

    it("18 months or less → nothing", () => {
      expect(score({ npm: { lastPublishAt: ago(17.9) } }).risk).toBe(0);
    });

    it("unknown release date → nothing", () => {
      expect(score({ npm: { lastPublishAt: null } }).risk).toBe(0);
    });
  });

  describe("GitHub push age", () => {
    it("over 24 months → +15", () => {
      expect(score({ github: { pushedAt: ago(25) } }).rules).toEqual([{ id: "stale-push", points: 15, months: 25 }]);
    });

    it("24 months or less → nothing", () => {
      expect(score({ github: { pushedAt: ago(23) } }).risk).toBe(0);
    });

    it("is skipped when GitHub data is missing, and the package is flagged npm-data-only", () => {
      const result = score({ github: null, githubStatus: "rate-limited" });
      expect(result.risk).toBe(0);
      expect(result.npmDataOnly).toBe(true);
    });
  });

  it("no linked repository → +10, and npm data only", () => {
    const result = score({ npm: { repositoryUrl: null, github: null }, github: null, githubStatus: "no-repo" });
    expect(result.rules).toEqual([{ id: "no-repo", points: 10 }]);
    expect(result.npmDataOnly).toBe(true);
  });

  it("a repo on another host is not penalized, but is npm data only", () => {
    const result = score({
      npm: { repositoryUrl: "https://gitlab.com/a/b", github: null },
      github: null,
      githubStatus: "not-github",
    });
    expect(result).toMatchObject({ risk: 0, npmDataOnly: true });
  });

  describe("possibly finished", () => {
    const finished: Overrides = {
      npm: { dependencyCount: 0, lastPublishAt: ago(48) },
      github: { openIssues: 9, pushedAt: ago(30) },
    };

    it("halves the release penalty and flags the package", () => {
      const result = score(finished);
      expect(result.possiblyFinished).toBe(true);
      expect(result.rules).toEqual([
        { id: "stale-release", points: 20, basePoints: 40, months: 48, halvedBy: ["possibly-finished"] },
        { id: "stale-push", points: 15, months: 30 },
      ]);
      expect(result.risk).toBe(35);
    });

    it("rounds a halved 25 up to 13", () => {
      expect(score({ ...finished, npm: { dependencyCount: 0, lastPublishAt: ago(20) } }).rules[0].points).toBe(13);
    });

    it("needs zero dependencies", () => {
      expect(score({ ...finished, npm: { dependencyCount: 1, lastPublishAt: ago(48) } }).possiblyFinished).toBe(false);
      expect(score({ ...finished, npm: { dependencyCount: null, lastPublishAt: ago(48) } }).possiblyFinished).toBe(false);
    });

    it("needs fewer than 10 open issues", () => {
      expect(score({ ...finished, github: { openIssues: 10, pushedAt: ago(30) } }).possiblyFinished).toBe(false);
    });

    it("needs GitHub data to count the issues", () => {
      expect(score({ ...finished, github: null, githubStatus: "error" }).possiblyFinished).toBe(false);
    });

    it("never applies to deprecated or archived packages", () => {
      expect(score({ ...finished, npm: { ...finished.npm, deprecated: "x" } }).possiblyFinished).toBe(false);
      expect(score({ ...finished, github: { ...finished.github, archived: true } }).possiblyFinished).toBe(false);
    });

    it("only shows up when the release is old enough to be penalized", () => {
      expect(score({ ...finished, npm: { dependencyCount: 0, lastPublishAt: ago(2) } }).possiblyFinished).toBe(false);
    });
  });

  describe("recent push", () => {
    it("a push in the last 12 months halves the release penalty", () => {
      expect(score({ npm: { lastPublishAt: ago(40) }, github: { pushedAt: ago(11) } }).rules).toEqual([
        { id: "stale-release", points: 20, basePoints: 40, months: 40, halvedBy: ["recent-push"] },
      ]);
    });

    it("a push 12 months ago or more does not", () => {
      expect(score({ npm: { lastPublishAt: ago(40) }, github: { pushedAt: ago(12.5) } }).risk).toBe(40);
    });

    it("halves only once when the package is also possibly finished", () => {
      const result = score({
        npm: { dependencyCount: 0, lastPublishAt: ago(40) },
        github: { openIssues: 0, pushedAt: ago(1) },
      });
      expect(result.rules).toEqual([
        {
          id: "stale-release",
          points: 20,
          basePoints: 40,
          months: 40,
          halvedBy: ["possibly-finished", "recent-push"],
        },
      ]);
    });
  });

  describe("critical", () => {
    it("is a single maintainer with more than 1M downloads a month", () => {
      expect(score({ npm: { maintainers: ["solo"] }, downloads: 1_000_001 }).critical).toBe(true);
    });

    it("needs both conditions", () => {
      expect(score({ npm: { maintainers: ["solo"] }, downloads: 1_000_000 }).critical).toBe(false);
      expect(score({ downloads: 50_000_000 }).critical).toBe(false);
      expect(score({ npm: { maintainers: ["solo"] }, downloads: null }).critical).toBe(false);
    });

    it("doubles the weight", () => {
      const critical = score({ npm: { maintainers: ["solo"] }, downloads: 9_999_999 });
      expect(critical.weight).toBeCloseTo(16);
    });
  });
});

describe("packageWeight", () => {
  it("is 1 + log10(downloads + 1)", () => {
    expect(packageWeight(0, false)).toBe(1);
    expect(packageWeight(null, false)).toBe(1);
    expect(packageWeight(999, false)).toBeCloseTo(4);
    expect(packageWeight(999, true)).toBeCloseTo(8);
  });
});

describe("minutesToMidnight", () => {
  it("is score / 10, rounded, never below 1", () => {
    expect([100, 82, 85, 14, 5, 0].map(minutesToMidnight)).toEqual([10, 8, 9, 1, 1, 1]);
  });
});

describe("monthsSince", () => {
  it("handles missing and invalid dates", () => {
    expect(monthsSince(null, NOW)).toBeNull();
    expect(monthsSince("nope", NOW)).toBeNull();
    expect(monthsSince(ago(6), NOW)).toBeCloseTo(6);
  });
});

describe("summarize", () => {
  const scored = (overrides: Overrides): ScoredPackage => {
    const p = pkg(overrides);
    return { ...p, risk: scorePackage(p, NOW) };
  };

  it("is 100 minus the download-weighted average risk", () => {
    // risk 0 with weight 4 (999 downloads) and risk 30 with weight 1 (0 downloads).
    const result = summarize([
      scored({ downloads: 999 }),
      scored({ npm: { maintainers: ["solo"] }, downloads: 0 }),
    ]);
    expect(result.score).toBe(94); // 100 − (0×4 + 30×1) / 5
    expect(result.minutesToMidnight).toBe(9);
    expect(result.level).toBe("low");
    expect(result.levels).toEqual({ low: 1, mid: 1, high: 0 });
  });

  it("counts critical packages double", () => {
    const solo = { npm: { maintainers: ["solo"] }, downloads: 9_999_999 };
    const healthy = { downloads: 9_999_999 };
    // Both weigh 8 before the critical bonus; the critical one weighs 16.
    expect(summarize([scored(solo), scored(healthy)]).score).toBe(80); // 100 − 30×16/24
    expect(summarize([scored(solo), scored(healthy)]).critical).toBe(1);
  });

  it("leaves packages without data out, and counts npm-data-only ones", () => {
    const missing: ScoredPackage = { ...pkg(), npmStatus: "error", npm: null, risk: null };
    const result = summarize([missing, scored({ github: null, githubStatus: "rate-limited" }), scored({})]);
    expect(result).toMatchObject({ scored: 2, unscored: 1, npmDataOnly: 1, score: 100 });
  });

  it("has no score when nothing could be scored", () => {
    const missing: ScoredPackage = { ...pkg(), npmStatus: "error", npm: null, risk: null };
    expect(summarize([missing])).toMatchObject({ score: null, level: null, minutesToMidnight: null, scored: 0 });
  });

  it("colors the project by its average risk", () => {
    expect(summarize([scored({ npm: { deprecated: "x" } })])).toMatchObject({
      score: 0,
      level: "high",
      minutesToMidnight: 1,
    });
  });

  it("is versioned", () => {
    expect(summarize([]).methodology).toBe(METHODOLOGY_VERSION);
    expect(METHODOLOGY_VERSION).toBe(1);
  });
});

describe("forecast", () => {
  it("attaches the risk and its rules to every package", () => {
    const result = forecast([pkg({ npm: { maintainers: ["solo"] } })], NOW);
    expect(result.packages[0].risk?.rules).toEqual([{ id: "single-maintainer", points: 30 }]);
    expect(result.forecast.score).toBe(70);
  });
});
