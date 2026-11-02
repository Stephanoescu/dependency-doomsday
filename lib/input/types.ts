/** Hard cap on how many packages a single forecast analyzes. */
export const MAX_PACKAGES = 150;

/** Hard cap on the size of a pasted / dropped / fetched package.json. */
export const MAX_INPUT_BYTES = 512 * 1024;

/** Root package.jsons with "workspaces" and fewer runtime deps than this get a monorepo hint. */
export const MONOREPO_DEPENDENCY_THRESHOLD = 5;

export type DependencyField = "dependencies" | "devDependencies";

export interface Dependency {
  /** Registry name that will be looked up (aliases are resolved to the real package). */
  name: string;
  field: DependencyField;
  /** Name as written in package.json, when it differs from `name` (npm: aliases). */
  alias?: string;
}

/** Why a dependency entry is not looked up on the npm registry. */
export type SkipReason =
  | "local" // file:, link:, portal:, relative paths
  | "workspace" // workspace:*
  | "git" // git+https://…, github:owner/repo, owner/repo
  | "url" // tarball URLs
  | "other-registry" // jsr:
  | "invalid-name"
  | "invalid-spec";

export interface SkippedDependency {
  name: string;
  field: DependencyField;
  reason: SkipReason;
}

export interface MonorepoInfo {
  /** Workspace globs declared in package.json, e.g. ["packages/*"]. */
  workspaces: string[];
  /** A workspace folder with a package.json, e.g. "packages/next", when one was found. */
  example?: string;
}

export type InputErrorCode =
  // Shared
  | "empty"
  | "too-large"
  | "unrecognized"
  | "unsupported-host"
  // package.json parsing
  | "invalid-json"
  | "not-package-json"
  | "no-dependencies"
  // GitHub fetching
  | "repo-not-found"
  | "package-json-not-found"
  /** The path is the folder that holds the workspaces ("packages/"), not a package. */
  | "workspace-folder"
  | "github-rate-limited"
  | "github-timeout"
  | "github-unavailable"
  | "bad-request"
  // Our own per-IP limit
  | "rate-limited"
  // Browser-only
  | "file-type"
  | "file-unreadable"
  | "network";

export interface ParseSuccess {
  ok: true;
  projectName?: string;
  packages: Dependency[];
  skipped: SkippedDependency[];
  /** How many packages were dropped because of MAX_PACKAGES. */
  truncated: number;
  monorepo?: MonorepoInfo;
}

export interface ParseFailure {
  ok: false;
  error: InputErrorCode;
  /** Present when the failure is likely explained by pasting a monorepo root. */
  monorepo?: MonorepoInfo;
}

export type ParseResult = ParseSuccess | ParseFailure;

/** Body of POST /api/resolve, also returned by the browser-side resolver. */
export type ResolveResponse =
  | (ParseSuccess & { ref?: GitHubRef })
  | (ParseFailure & { ref?: GitHubRef; location?: string; retryAfter?: number; example?: string });

export interface GitHubRef {
  owner: string;
  repo: string;
  /** Branch, tag or commit. Undefined means the default branch. */
  ref?: string;
  /** Directory inside the repo that holds package.json, without leading/trailing slashes. */
  path?: string;
}
