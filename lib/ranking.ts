import type { FundingLink } from "@/lib/analysis/types";
import type { GitHubRef } from "@/lib/input/types";
import type { Finding, ResultState } from "@/lib/narrative";
import type { RiskLevel, ScoredPackage } from "@/lib/risk";

export type RankingCategory = "framework" | "build" | "tooling" | "testing" | "library";

export interface RankingProject {
  id: string;
  ref: GitHubRef;
  category: RankingCategory;
}

/**
 * Chosen for variety — server and front-end frameworks, build tools, linters,
 * test runners and libraries — not for how they score. Each needs its own npm
 * dependencies (packages whose dependencies are all workspace:* can't be scored).
 */
export const RANKING_PROJECTS: RankingProject[] = [
  { id: "express", ref: { owner: "expressjs", repo: "express" }, category: "framework" },
  { id: "fastify", ref: { owner: "fastify", repo: "fastify" }, category: "framework" },
  { id: "next", ref: { owner: "vercel", repo: "next.js", ref: "canary", path: "packages/next" }, category: "framework" },
  { id: "svelte", ref: { owner: "sveltejs", repo: "svelte", path: "packages/svelte" }, category: "framework" },
  { id: "vite", ref: { owner: "vitejs", repo: "vite", path: "packages/vite" }, category: "build" },
  { id: "webpack", ref: { owner: "webpack", repo: "webpack" }, category: "build" },
  { id: "eslint", ref: { owner: "eslint", repo: "eslint" }, category: "tooling" },
  { id: "mocha", ref: { owner: "mochajs", repo: "mocha" }, category: "testing" },
  { id: "axios", ref: { owner: "axios", repo: "axios" }, category: "library" },
  { id: "socket.io", ref: { owner: "socketio", repo: "socket.io", path: "packages/socket.io" }, category: "library" },
];

/** What the heroes section needs from each package that one person holds up. */
export interface SoloPackage {
  name: string;
  maintainer: string;
  downloads: number | null;
  critical: boolean;
  funding: FundingLink | null;
}

export interface RankingEntry {
  id: string;
  category: RankingCategory;
  label: string;
  /** Share path of the full forecast. */
  path: string;
  state: ResultState;
  score: number | null;
  minutesToMidnight: number | null;
  level: RiskLevel | null;
  finding: Finding;
  total: number;
  critical: number;
  soloPackages: SoloPackage[];
}

export interface RankingHero {
  user: string;
  /** Their single-maintainer packages used by the ranked projects, most downloaded first. */
  packages: { name: string; downloads: number | null; critical: boolean }[];
  /** Ranked projects that depend on at least one of them. */
  projects: string[];
  support: { kind: "funding"; url: string } | { kind: "npm-profile"; url: string };
}

export interface RankingSnapshot {
  generatedAt: string;
  entries: RankingEntry[];
  heroes: RankingHero[];
  /** Projects that failed to compute this time (GitHub down, repo moved…). */
  failed: string[];
}

export function soloPackagesOf(packages: ScoredPackage[]): SoloPackage[] {
  return packages
    .filter((p) => p.risk && p.npm?.maintainers.length === 1)
    .map((p) => ({
      name: p.name,
      maintainer: p.npm!.maintainers[0],
      downloads: p.downloads,
      critical: p.risk!.critical,
      funding: p.npm!.funding?.[0] ?? null,
    }));
}

export const MAX_RANKING_HEROES = 8;

/**
 * npm accounts run by automation, not people (e.g. "types" publishes every
 * @types package for DefinitelyTyped). They still count in scores, but they
 * aren't anyone to thank.
 */
export const AUTOMATION_ACCOUNTS = new Set(["types"]);

/**
 * People whose single-maintainer packages the ranked projects share. Ordered
 * by how many projects rely on them, then by critical packages, then downloads.
 */
export function rankingHeroes(entries: RankingEntry[], npmProfileUrl: (user: string) => string): RankingHero[] {
  const byUser = new Map<
    string,
    { packages: Map<string, SoloPackage>; projects: Set<string>; funding: FundingLink | null }
  >();
  for (const entry of entries) {
    for (const pkg of entry.soloPackages) {
      if (AUTOMATION_ACCOUNTS.has(pkg.maintainer)) continue;
      let hero = byUser.get(pkg.maintainer);
      if (!hero) {
        hero = { packages: new Map(), projects: new Set(), funding: null };
        byUser.set(pkg.maintainer, hero);
      }
      hero.packages.set(pkg.name, pkg);
      hero.projects.add(entry.label);
      hero.funding ??= pkg.funding;
    }
  }

  const heroes = [...byUser].map(([user, h]) => {
    const packages = [...h.packages.values()].sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));
    return {
      user,
      packages: packages.map(({ name, downloads, critical }) => ({ name, downloads, critical })),
      projects: [...h.projects].sort(),
      support: h.funding
        ? ({ kind: "funding", url: h.funding.url } as const)
        : ({ kind: "npm-profile", url: npmProfileUrl(user) } as const),
      criticalCount: packages.filter((p) => p.critical).length,
      totalDownloads: packages.reduce((sum, p) => sum + (p.downloads ?? 0), 0),
    };
  });

  heroes.sort(
    (a, b) =>
      b.projects.length - a.projects.length ||
      b.criticalCount - a.criticalCount ||
      b.totalDownloads - a.totalDownloads ||
      a.user.localeCompare(b.user),
  );
  return heroes.slice(0, MAX_RANKING_HEROES).map(({ user, packages, projects, support }) => ({
    user,
    packages,
    projects,
    support,
  }));
}

/** Closest to midnight first; projects without a score last. */
export function orderEntries(entries: RankingEntry[]): RankingEntry[] {
  return [...entries].sort((a, b) => (a.score ?? 101) - (b.score ?? 101) || a.label.localeCompare(b.label));
}
