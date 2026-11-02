import type { Dependency } from "@/lib/input/types";
import type { Forecast, ScoredPackage } from "@/lib/risk";

/** The only npm registry fields we keep (and cache). Emails are never stored. */
export interface NpmInfo {
  name: string;
  latestVersion: string | null;
  /** Deprecation message of the latest version, if any. */
  deprecated: string | null;
  /** The package was unpublished from the registry. */
  unpublished: boolean;
  /** npm usernames of the current maintainers. */
  maintainers: string[];
  /** Most recent publish of any version (ISO date). */
  lastPublishAt: string | null;
  createdAt: string | null;
  /** Runtime dependencies declared by the latest version; null when it can't be read. */
  dependencyCount: number | null;
  /** Funding links of the latest version (https only), e.g. GitHub Sponsors or Open Collective. */
  funding: FundingLink[];
  /** Normalized https URL of the linked repository, or null when none is linked. */
  repositoryUrl: string | null;
  /** Set when the repository is on GitHub. */
  github: { owner: string; repo: string } | null;
}

export interface FundingLink {
  url: string;
  /** "github", "opencollective", "patreon"… when the package says so. */
  type: string | null;
}

/** The only GitHub /repos fields we keep (and cache). */
export interface GitHubRepoInfo {
  /** Canonical owner/repo, after following renames. */
  fullName: string;
  pushedAt: string | null;
  archived: boolean;
  openIssues: number;
  stars: number;
  ownerType: string;
}

export type NpmStatus = "ok" | "not-found" | "error";
export type DownloadsStatus = "ok" | "not-found" | "error";
export type GitHubStatus =
  | "ok"
  | "not-found"
  | "no-repo" // npm has no repository field
  | "not-github" // repository is on another host
  | "rate-limited"
  | "error";

export interface PackageData extends Dependency {
  npmStatus: NpmStatus;
  npm: NpmInfo | null;
  downloadsStatus: DownloadsStatus;
  /** Downloads in the last month. */
  downloads: number | null;
  githubStatus: GitHubStatus;
  github: GitHubRepoInfo | null;
}

export interface GitHubQuota {
  /** A GITHUB_TOKEN was used (5,000 req/h instead of 60). */
  authenticated: boolean;
  limit: number | null;
  remaining: number | null;
  /** When the hourly window resets (ISO date). */
  resetAt: string | null;
  /** The limit was hit during this analysis; some repos were skipped. */
  exhausted: boolean;
}

export interface AnalysisResult {
  /** Raw evidence plus the risk computed from it (with the rules that fired). */
  packages: ScoredPackage[];
  forecast: Forecast;
  github: GitHubQuota;
  generatedAt: string;
}

/** Lines of the NDJSON stream returned by POST /api/analyze. */
export type AnalysisEvent =
  | { type: "start"; total: number }
  | { type: "progress"; done: number; total: number; name: string }
  | { type: "result"; result: AnalysisResult }
  | { type: "error"; error: "bad-request" | "internal" }
  | { type: "error"; error: "rate-limited"; retryAfter: number };

/**
 * Every package got the GitHub data it was supposed to: none skipped by the
 * rate limit or a GitHub error. Incomplete results are shown, never cached.
 */
export function isComplete(packages: Pick<PackageData, "githubStatus">[]): boolean {
  return packages.every((p) => p.githubStatus !== "rate-limited" && p.githubStatus !== "error");
}

/** A package without npm data cannot be scored ("no data"). */
export function hasData(pkg: PackageData): boolean {
  return pkg.npmStatus === "ok" && pkg.npm !== null;
}

/** Below this many remaining unauthenticated requests, the UI warns about the GitHub limit. */
export const GITHUB_LOW_QUOTA = 20;

/**
 * Why packages were left out of the score: npm answered 404 (usually a
 * private package) or a source failed (network error, timeout, 5xx).
 */
export function unscoredReasons(packages: PackageData[]): { notFound: number; failed: number } {
  let notFound = 0;
  let failed = 0;
  for (const pkg of packages) {
    if (hasData(pkg)) continue;
    if (pkg.npmStatus === "not-found") notFound++;
    else failed++;
  }
  return { notFound, failed };
}
