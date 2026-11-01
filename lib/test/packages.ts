import type { GitHubRepoInfo, NpmInfo, PackageData } from "@/lib/analysis/types";

/** Shared test factory: a reference "now" and packages relative to it. */
export const NOW = Date.parse("2026-06-01T00:00:00Z");
export const MONTH = (365.25 / 12) * 24 * 3600 * 1000;
export const ago = (months: number) => new Date(NOW - months * MONTH).toISOString();

export interface Overrides {
  npm?: Partial<NpmInfo>;
  github?: Partial<GitHubRepoInfo> | null;
  downloads?: number | null;
  githubStatus?: PackageData["githubStatus"];
}

/** A healthy package: 3 maintainers, released last month, pushed last week. */
export function pkg({ npm, github, downloads = 1_000, githubStatus }: Overrides = {}): PackageData {
  const info: NpmInfo = {
    name: "pkg",
    latestVersion: "1.0.0",
    deprecated: null,
    unpublished: false,
    maintainers: ["a", "b", "c"],
    lastPublishAt: ago(1),
    createdAt: ago(100),
    dependencyCount: 2,
    funding: [],
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

