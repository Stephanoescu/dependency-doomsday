import type { AnalysisResult, GitHubRepoInfo, NpmInfo, PackageData } from "@/lib/analysis/types";
import type { Dependency } from "@/lib/input/types";
import { cacheKey, getCache, TTL, type CacheWrite } from "./cache";
import { createGitHubBudget, fetchRepo, type GitHubBudget, type RepoLookup } from "./github";
import { createLimiter, MAX_CONCURRENCY, type Limiter } from "./limiter";
import { fetchDownloads, fetchNpmInfo, type DownloadsLookup, type NpmLookup } from "./npm";

/** What we cache per package/repo. Errors and rate limits are never cached. */
type CachedNpm = { found: true; info: NpmInfo } | { found: false };
type CachedRepo = { found: true; info: GitHubRepoInfo } | { found: false };

export interface AnalyzeOptions {
  signal?: AbortSignal;
  /** Called once per package, after its npm and GitHub data are in. */
  onProgress?: (done: number, total: number, name: string) => void;
}

/**
 * Collects npm registry, npm downloads and GitHub data for each package.
 * Never throws for a failing source: the package gets an error status and
 * the analysis continues.
 */
export async function analyzePackages(
  deps: Dependency[],
  { signal, onProgress }: AnalyzeOptions = {},
): Promise<AnalysisResult> {
  const cache = getCache();
  const limit = createLimiter(MAX_CONCURRENCY);
  const writes: CacheWrite[] = [];
  const names = deps.map((d) => d.name);

  const [cachedNpm, cachedDownloads, budget] = await Promise.all([
    cache.getMany<CachedNpm>(names.map(cacheKey.npm)),
    cache.getMany<number | null>(names.map(cacheKey.downloads)),
    createGitHubBudget(signal),
  ]);

  // Downloads run alongside everything else; bulk calls take few limiter slots.
  const downloadsPromise = loadDownloads(names, cachedDownloads, limit, writes, signal);

  const repoLookups = new Map<string, Promise<RepoLookup>>();
  const lookupRepo = (owner: string, repo: string) => {
    const key = cacheKey.github(owner, repo);
    let lookup = repoLookups.get(key);
    if (!lookup) {
      lookup = loadRepo(owner, repo, key, budget, limit, writes, signal);
      repoLookups.set(key, lookup);
    }
    return lookup;
  };

  let done = 0;
  const partial = await Promise.all(
    deps.map(async (dep, i) => {
      const npm = await loadNpm(dep.name, cachedNpm[i], limit, writes, signal);
      const info = npm.status === "ok" ? npm.info : null;

      let github: RepoLookup;
      if (!info) github = { status: "error", info: null };
      else if (!info.repositoryUrl) github = { status: "no-repo", info: null };
      else if (!info.github) github = { status: "not-github", info: null };
      else github = await lookupRepo(info.github.owner, info.github.repo);

      onProgress?.(++done, deps.length, dep.name);
      return { dep, npm, info, github };
    }),
  );

  const downloads = await downloadsPromise;
  await cache.setMany(writes);

  const packages: PackageData[] = partial.map(({ dep, npm, info, github }) => {
    const dl = downloads.get(dep.name) ?? { status: "error", downloads: null };
    return {
      ...dep,
      npmStatus: npm.status,
      npm: info,
      downloadsStatus: dl.status,
      downloads: dl.downloads,
      githubStatus: github.status,
      github: github.info,
    };
  });

  return { packages, github: budget.snapshot(), generatedAt: new Date().toISOString() };
}

async function loadNpm(
  name: string,
  cached: CachedNpm | undefined,
  limit: Limiter,
  writes: CacheWrite[],
  signal?: AbortSignal,
): Promise<NpmLookup> {
  if (cached) return cached.found ? { status: "ok", info: cached.info } : { status: "not-found" };

  const result = await limit(() => fetchNpmInfo(name, signal));
  if (result.status === "ok") {
    writes.push({ key: cacheKey.npm(name), value: { found: true, info: result.info }, ttl: TTL.data });
  } else if (result.status === "not-found") {
    writes.push({ key: cacheKey.npm(name), value: { found: false }, ttl: TTL.missing });
  }
  return result;
}

async function loadRepo(
  owner: string,
  repo: string,
  key: string,
  budget: GitHubBudget,
  limit: Limiter,
  writes: CacheWrite[],
  signal?: AbortSignal,
): Promise<RepoLookup> {
  const [cached] = await getCache().getMany<CachedRepo>([key]);
  if (cached) return cached.found ? { status: "ok", info: cached.info } : { status: "not-found", info: null };

  const result = await limit(() => fetchRepo(owner, repo, budget, signal));
  if (result.status === "ok") {
    writes.push({ key, value: { found: true, info: result.info }, ttl: TTL.data });
  } else if (result.status === "not-found") {
    writes.push({ key, value: { found: false }, ttl: TTL.missing });
  }
  return result;
}

async function loadDownloads(
  names: string[],
  cached: (number | null | undefined)[],
  limit: Limiter,
  writes: CacheWrite[],
  signal?: AbortSignal,
): Promise<Map<string, DownloadsLookup>> {
  const out = new Map<string, DownloadsLookup>();
  const misses: string[] = [];
  names.forEach((name, i) => {
    const value = cached[i];
    if (value === undefined) misses.push(name);
    else out.set(name, value === null ? { status: "not-found", downloads: null } : { status: "ok", downloads: value });
  });
  if (misses.length === 0) return out;

  for (const [name, result] of await fetchDownloads(misses, limit, signal)) {
    out.set(name, result);
    if (result.status === "ok") {
      writes.push({ key: cacheKey.downloads(name), value: result.downloads, ttl: TTL.data });
    } else if (result.status === "not-found") {
      writes.push({ key: cacheKey.downloads(name), value: null, ttl: TTL.missing });
    }
  }
  return out;
}
