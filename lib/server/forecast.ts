import { createHash } from "node:crypto";
import { isComplete, type AnalysisResult } from "@/lib/analysis/types";
import { getMessages } from "@/lib/i18n";
import { formatGitHubRef } from "@/lib/input/github-url";
import { parsePackageJson } from "@/lib/input/package-json";
import type { Dependency, GitHubRef, InputErrorCode, ParseSuccess } from "@/lib/input/types";
import { findHeadline, resultState, writeFinding, type Finding, type ResultState } from "@/lib/narrative";
import type { RiskLevel } from "@/lib/risk";
import { listDependencies, sourceLabel, type ShareSource } from "@/lib/share/links";
import { analyzePackages } from "./analyze";
import { cacheKey, getCache, TTL } from "./cache";
import { fetchPackageJsonFromGitHub } from "./github";

/** Everything an image or badge needs, small enough to cache cheaply. */
export interface ForecastSummary {
  label?: string;
  state: ResultState;
  score: number | null;
  minutesToMidnight: number | null;
  level: RiskLevel | null;
  /** The worst finding; worded at render time, with the project's name. */
  finding: Finding;
  total: number;
  scored: number;
  critical: number;
  levels: Record<RiskLevel, number>;
}

export type SummaryOutcome = { ok: true; summary: ForecastSummary } | { ok: false; error: InputErrorCode };

/** Stable key for a set of dependencies, whatever order they came in. */
export function depsKey(deps: Dependency[]): string {
  const lines = deps.map((d) => `${d.field}:${d.name}`).sort();
  return createHash("sha256").update(lines.join("\n")).digest("hex").slice(0, 32);
}

export function summarizeResult(result: AnalysisResult, label?: string): ForecastSummary {
  const { forecast, packages } = result;
  return {
    ...(label && { label }),
    state: resultState(forecast, packages.length),
    score: forecast.score,
    minutesToMidnight: forecast.minutesToMidnight,
    level: forecast.level,
    finding: findHeadline(packages, forecast),
    total: packages.length,
    scored: forecast.scored,
    critical: forecast.critical,
    levels: forecast.levels,
  };
}

/** Called after every analysis so share images for it can be drawn instantly. */
/** Third-person headline for share images: "expressjs/express: its most critical dependency…". */
export function imageHeadline(summary: ForecastSummary): string {
  const t = getMessages().og;
  return writeFinding(summary.finding, t.headline, { project: summary.label || t.thisProject });
}

/**
 * Called after every analysis: the small summary (for images and badges) and
 * the full result (so a share link opened soon after renders on the server).
 */
export async function saveSummary(deps: Dependency[], result: AnalysisResult, label?: string): Promise<void> {
  // A forecast missing GitHub data (rate limit, outage) shouldn't stick around for hours.
  if (!isComplete(result.packages)) return;
  const key = depsKey(deps);
  await getCache().setMany([
    { key: cacheKey.summary(key), value: summarizeResult(result, label), ttl: TTL.summary },
    { key: cacheKey.result(key), value: result, ttl: TTL.result },
  ]);
}

type CachedDeps = Pick<ParseSuccess, "projectName" | "skipped" | "truncated"> & { deps: Dependency[] };

function repoDepsKey(source: Extract<ShareSource, { kind: "repo" }>): string {
  return cacheKey.repoDeps(`${formatGitHubRef(source.ref)}${source.includeDev ? "+dev" : ""}`);
}

/** The dependency list behind a share link: decoded from the URL, or read from the repo (cached 1 h). */
export async function resolveSource(
  source: ShareSource,
): Promise<{ ok: true; deps: Dependency[]; label?: string } | { ok: false; error: InputErrorCode }> {
  if (source.kind === "list") {
    return { ok: true, deps: listDependencies(source.list), label: source.list.projectName };
  }

  const key = repoDepsKey(source);
  const [cached] = await getCache().getMany<CachedDeps>([key]);
  if (cached) return { ok: true, deps: cached.deps, label: sourceLabel(source) };

  const fetched = await fetchPackageJsonFromGitHub(source.ref);
  if (!fetched.ok) return fetched;
  const parsed = parsePackageJson(fetched.text, { includeDev: source.includeDev });
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const deps = parsed.packages.map(({ name, field }) => ({ name, field }));
  const value: CachedDeps = {
    deps,
    projectName: parsed.projectName,
    skipped: parsed.skipped,
    truncated: parsed.truncated,
  };
  await getCache().setMany([{ key, value, ttl: TTL.deps }]);
  return { ok: true, deps, label: sourceLabel(source) };
}

/**
 * The full forecast for a share link, from cache only — never computes or
 * fetches. Lets the page render the result on the server when someone
 * analyzed it within the last hour.
 */
export async function cachedForecast(
  source: ShareSource,
): Promise<{ parsed: ParseSuccess & { ref?: GitHubRef }; analysis: AnalysisResult } | null> {
  let parsed: ParseSuccess & { ref?: GitHubRef };
  if (source.kind === "list") {
    const deps = listDependencies(source.list);
    parsed = { ok: true, projectName: source.list.projectName, packages: deps, skipped: [], truncated: 0 };
  } else {
    const [deps] = await getCache().getMany<CachedDeps>([repoDepsKey(source)]);
    if (!deps) return null;
    parsed = {
      ok: true,
      projectName: deps.projectName,
      packages: deps.deps,
      skipped: deps.skipped ?? [],
      truncated: deps.truncated ?? 0,
      ref: source.ref,
    };
  }
  const [analysis] = await getCache().getMany<AnalysisResult>([cacheKey.result(depsKey(parsed.packages))]);
  return analysis ? { parsed, analysis } : null;
}

/** Summary for a share link: from cache when anyone analyzed it recently, otherwise computed. */
export async function summaryFor(source: ShareSource): Promise<SummaryOutcome> {
  const resolved = await resolveSource(source);
  if (!resolved.ok) return resolved;

  const key = cacheKey.summary(depsKey(resolved.deps));
  const [cached] = await getCache().getMany<ForecastSummary>([key]);
  if (cached) return { ok: true, summary: { ...cached, label: resolved.label } };

  const result = await analyzePackages(resolved.deps);
  await saveSummary(resolved.deps, result, resolved.label);
  return { ok: true, summary: summarizeResult(result, resolved.label) };
}

export const TIMED_OUT = Symbol("timed-out");

/** Resolves with the promise's value, or TIMED_OUT after `ms`. The promise keeps running. */
export function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
