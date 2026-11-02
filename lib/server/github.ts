import type { GitHubQuota, GitHubRepoInfo, GitHubStatus } from "@/lib/analysis/types";
import { rawFileUrl } from "@/lib/input/github-url";
import { workspaceCandidates } from "@/lib/input/monorepo";
import { readWorkspaces } from "@/lib/input/package-json";
import { MAX_INPUT_BYTES, type GitHubRef, type InputErrorCode } from "@/lib/input/types";
import { parseLernaJson, parsePnpmWorkspaceYaml } from "@/lib/input/workspaces";
import { getJson, USER_AGENT } from "./http";

const API = "https://api.github.com";
const TIMEOUT_MS = 8_000;

// Set when GitHub answers 401: the token is wrong, so fall back to anonymous requests.
let tokenRejected = false;

function token(): string | undefined {
  return tokenRejected ? undefined : process.env.GITHUB_TOKEN?.trim() || undefined;
}

/** Headers for api.github.com. GITHUB_TOKEN is optional and raises the limit from 60 to 5,000 req/h. */
export function githubApiHeaders(): HeadersInit {
  const t = token();
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(t && { Authorization: `Bearer ${t}` }),
  };
}

function rejectToken() {
  if (!tokenRejected) {
    tokenRejected = true;
    console.warn("[github] GITHUB_TOKEN was rejected (401). Falling back to unauthenticated requests.");
  }
}

function num(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Tracks the hourly API quota during one analysis. Each request reserves a
 * unit up front (8 can be in flight), and response headers keep the count honest.
 */
export class GitHubBudget {
  limit: number | null = null;
  remaining: number | null = null;
  resetAt: number | null = null; // epoch seconds
  exhausted = false;

  get authenticated(): boolean {
    return token() !== undefined;
  }

  /** Reserves one request; false when the hourly quota is used up. */
  reserve(): boolean {
    if (this.exhausted) return false;
    if (this.remaining !== null) {
      if (this.remaining <= 0) {
        this.exhausted = true;
        return false;
      }
      this.remaining--;
    }
    return true;
  }

  update(headers: Headers | undefined) {
    if (!headers) return;
    const limit = num(headers.get("x-ratelimit-limit"));
    const remaining = num(headers.get("x-ratelimit-remaining"));
    const reset = num(headers.get("x-ratelimit-reset"));
    if (limit !== null) this.limit = limit;
    if (remaining === null) return;
    // A later reset time means a new hourly window: trust the header.
    // Otherwise keep the lower count, since responses can arrive out of order.
    if (reset !== null && (this.resetAt === null || reset > this.resetAt)) {
      this.resetAt = reset;
      this.remaining = remaining;
    } else {
      this.remaining = this.remaining === null ? remaining : Math.min(this.remaining, remaining);
    }
  }

  markExhausted() {
    this.exhausted = true;
    this.remaining = 0;
  }

  snapshot(): GitHubQuota {
    return {
      authenticated: this.authenticated,
      limit: this.limit,
      remaining: this.remaining,
      resetAt: this.resetAt === null ? null : new Date(this.resetAt * 1_000).toISOString(),
      exhausted: this.exhausted,
    };
  }
}

/** Reads the current quota. GET /rate_limit does not count against the limit. */
export async function createGitHubBudget(signal?: AbortSignal): Promise<GitHubBudget> {
  const budget = new GitHubBudget();
  let result = await getJson(`${API}/rate_limit`, {
    headers: githubApiHeaders(),
    timeoutMs: 4_000,
    signal,
    retries: 0,
  });
  if (!result.ok && result.status === 401 && token()) {
    rejectToken();
    result = await getJson(`${API}/rate_limit`, { headers: githubApiHeaders(), timeoutMs: 4_000, signal, retries: 0 });
  }
  if (result.ok) {
    const core = (result.json as { resources?: { core?: Record<string, unknown> } })?.resources?.core;
    budget.limit = typeof core?.limit === "number" ? core.limit : null;
    budget.remaining = typeof core?.remaining === "number" ? core.remaining : null;
    budget.resetAt = typeof core?.reset === "number" ? core.reset : null;
  }
  return budget;
}

export type RepoLookup = { status: GitHubStatus; info: GitHubRepoInfo | null };

function isRateLimited(status: number | undefined, headers: Headers | undefined, json: unknown) {
  if (status === 429) return true;
  if (status !== 403) return false;
  if (headers?.get("x-ratelimit-remaining") === "0") return true;
  const message = (json as { message?: unknown })?.message;
  return typeof message === "string" && /rate limit/i.test(message);
}

function toRepoInfo(json: unknown): GitHubRepoInfo {
  const r = (json ?? {}) as Record<string, unknown>;
  const owner = (r.owner ?? {}) as Record<string, unknown>;
  return {
    fullName: typeof r.full_name === "string" ? r.full_name : "",
    pushedAt: typeof r.pushed_at === "string" ? r.pushed_at : null,
    archived: r.archived === true,
    openIssues: typeof r.open_issues_count === "number" ? r.open_issues_count : 0,
    stars: typeof r.stargazers_count === "number" ? r.stargazers_count : 0,
    ownerType: typeof owner.type === "string" ? owner.type : "User",
  };
}

/** GET /repos/{owner}/{repo}. Renamed repos are followed (GitHub answers 301). */
export async function fetchRepo(
  owner: string,
  repo: string,
  budget: GitHubBudget,
  signal?: AbortSignal,
): Promise<RepoLookup> {
  if (!budget.reserve()) return { status: "rate-limited", info: null };

  const url = `${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  let result = await getJson(url, { headers: githubApiHeaders(), timeoutMs: TIMEOUT_MS, signal });
  if (!result.ok && result.status === 401 && token()) {
    rejectToken();
    result = await getJson(url, { headers: githubApiHeaders(), timeoutMs: TIMEOUT_MS, signal });
  }
  budget.update(result.headers);

  if (result.ok) return { status: "ok", info: toRepoInfo(result.json) };
  if (result.reason === "http") {
    if (result.status === 404 || result.status === 451) return { status: "not-found", info: null };
    if (isRateLimited(result.status, result.headers, result.json)) {
      budget.markExhausted();
      return { status: "rate-limited", info: null };
    }
  }
  if (result.reason !== "aborted") {
    console.warn(`[github] ${owner}/${repo}: ${result.reason}${result.status ? ` ${result.status}` : ""}`);
  }
  return { status: "error", info: null };
}

function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && error.name === "TimeoutError";
}

/** true / false when GitHub answered clearly, undefined when it couldn't tell (rate limit, outage). */
async function repoExists({ owner, repo }: GitHubRef): Promise<boolean | undefined> {
  const result = await getJson(
    `${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { headers: githubApiHeaders(), timeoutMs: TIMEOUT_MS, retries: 0 },
  );
  if (result.ok) return true;
  if (result.status === 404) return false;
  return undefined;
}

export type FetchPackageJsonResult =
  | { ok: true; text: string }
  | { ok: false; error: InputErrorCode };

/**
 * Downloads package.json from a public GitHub repo via raw.githubusercontent.com,
 * which serves the default branch at HEAD and does not use the API rate limit.
 * Only on a 404 do we spend one API call to tell "no repo" from "no package.json".
 */
export async function fetchPackageJsonFromGitHub(ref: GitHubRef): Promise<FetchPackageJsonResult> {
  let res: Response;
  try {
    res = await fetch(rawFileUrl(ref), {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    return { ok: false, error: isTimeout(error) ? "github-timeout" : "github-unavailable" };
  }

  if (res.status === 404) {
    const exists = await repoExists(ref);
    if (exists === undefined) return { ok: false, error: "github-unavailable" };
    return { ok: false, error: exists ? "package-json-not-found" : "repo-not-found" };
  }
  if (res.status === 429 || res.status === 403) return { ok: false, error: "github-rate-limited" };
  if (!res.ok) return { ok: false, error: "github-unavailable" };

  if (Number(res.headers.get("content-length") ?? 0) > MAX_INPUT_BYTES) {
    return { ok: false, error: "too-large" };
  }
  try {
    return { ok: true, text: await res.text() };
  } catch (error) {
    return { ok: false, error: isTimeout(error) ? "github-timeout" : "github-unavailable" };
  }
}

async function fetchRawText(ref: GitHubRef, file: string): Promise<string | undefined> {
  try {
    const res = await fetch(rawFileUrl(ref, file), {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (!res.ok || Number(res.headers.get("content-length") ?? 0) > 64 * 1024) return undefined;
    return await res.text();
  } catch {
    return undefined;
  }
}

/**
 * Workspace globs from pnpm-workspace.yaml or lerna.json next to package.json.
 * Both reads go through raw.githubusercontent.com, so they cost no API quota.
 */
export async function fetchExternalWorkspaces(ref: GitHubRef): Promise<string[] | undefined> {
  const [pnpm, lerna] = await Promise.all([
    fetchRawText(ref, "pnpm-workspace.yaml"),
    fetchRawText(ref, "lerna.json"),
  ]);
  const pnpmGlobs = pnpm === undefined ? [] : parsePnpmWorkspaceYaml(pnpm);
  if (pnpmGlobs.length) return pnpmGlobs;
  const lernaGlobs = lerna === undefined ? undefined : parseLernaJson(lerna);
  return lernaGlobs?.length ? lernaGlobs : undefined;
}

function isPackageJson(text: string | undefined): boolean {
  if (text === undefined) return false;
  try {
    const json: unknown = JSON.parse(text);
    return typeof json === "object" && json !== null && !Array.isArray(json);
  } catch {
    return false;
  }
}

/**
 * The first likely workspace folder that has a package.json ("packages/next"
 * for vercel/next.js). A handful of parallel reads through
 * raw.githubusercontent.com, so it costs no API quota.
 */
export async function findWorkspacePackage(ref: GitHubRef, workspaces: string[]): Promise<string | undefined> {
  const candidates = workspaceCandidates(workspaces, ref);
  const files = await Promise.all(candidates.map((path) => fetchRawText({ ...ref, path }, "package.json")));
  return candidates.find((_, i) => isPackageJson(files[i]));
}

/** Workspace globs declared at the repo root (package.json, pnpm or Lerna). No API quota. */
export async function fetchRootWorkspaces(ref: GitHubRef): Promise<string[] | undefined> {
  const root = { ...ref, path: undefined };
  const text = await fetchRawText(root, "package.json");
  if (text !== undefined) {
    try {
      const pkg: unknown = JSON.parse(text);
      const declared = typeof pkg === "object" && pkg !== null ? readWorkspaces(pkg as Record<string, unknown>) : undefined;
      if (declared?.length) return declared;
    } catch {
      // Not JSON: look for pnpm or Lerna instead.
    }
  }
  return fetchExternalWorkspaces(root);
}
