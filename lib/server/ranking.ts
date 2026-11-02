import { isComplete } from "@/lib/analysis/types";
import { npmProfileUrl } from "@/lib/narrative";
import {
  orderEntries,
  RANKING_PROJECTS,
  rankingHeroes,
  soloPackagesOf,
  type RankingEntry,
  type RankingProject,
  type RankingSnapshot,
} from "@/lib/ranking";
import { sharePath, type ShareSource } from "@/lib/share/links";
import { analyzePackages } from "./analyze";
import { cacheKey, getCache } from "./cache";
import { resolveSource, saveSummary, summarizeResult } from "./forecast";

const HOUR = 3_600;
/** Kept a week so a failed cron run still leaves yesterday's ranking up. */
const SNAPSHOT_TTL = 7 * 24 * HOUR;
/** Half-finished runs older than this start over. */
const PROGRESS_TTL = 6 * HOUR;
/** Projects computed side by side; each analysis already runs 8 requests at a time. */
const WAVE_SIZE = 3;

interface Progress {
  startedAt: string;
  entries: Record<string, RankingEntry>;
  failed: string[];
}

export async function computeRankingEntry(project: RankingProject): Promise<RankingEntry | null> {
  const source: ShareSource = { kind: "repo", ref: project.ref, includeDev: false };
  const resolved = await resolveSource(source);
  if (!resolved.ok) return null;
  const result = await analyzePackages(resolved.deps);
  // Missing GitHub data would make a project look better or worse than it is: retry next run.
  if (!isComplete(result.packages)) {
    console.warn(`[ranking] ${project.id}: incomplete GitHub data, keeping the previous entry`);
    return null;
  }
  // Also warms the share image and badge for this project.
  await saveSummary(resolved.deps, result, resolved.label);
  const summary = summarizeResult(result, resolved.label);
  return {
    id: project.id,
    category: project.category,
    label: resolved.label ?? project.id,
    path: sharePath(source),
    state: summary.state,
    score: summary.score,
    minutesToMidnight: summary.minutesToMidnight,
    level: summary.level,
    finding: summary.finding,
    total: summary.total,
    critical: summary.critical,
    soloPackages: soloPackagesOf(result.packages),
  };
}

export function buildSnapshot(entries: RankingEntry[], failed: string[], now = new Date()): RankingSnapshot {
  return {
    generatedAt: now.toISOString(),
    entries: orderEntries(entries),
    heroes: rankingHeroes(entries, npmProfileUrl),
    failed,
  };
}

export async function getRankingSnapshot(): Promise<RankingSnapshot | null> {
  const [snapshot] = await getCache().getMany<RankingSnapshot>([cacheKey.ranking()]);
  return snapshot ?? null;
}

export interface AdvanceResult {
  done: boolean;
  processed: string[];
  remaining: string[];
  elapsedMs: number;
  snapshot?: RankingSnapshot;
}

/**
 * Computes the ranking in resumable steps. Each call starts new waves of
 * projects only while `budgetMs` hasn't run out, saves progress to the cache,
 * and publishes the snapshot once every project is done. Call it again to continue.
 */
export async function advanceRanking({
  budgetMs,
  projects = RANKING_PROJECTS,
  now = Date.now,
}: {
  budgetMs: number;
  projects?: RankingProject[];
  now?: () => number;
}): Promise<AdvanceResult> {
  const started = now();
  const cache = getCache();
  const [saved] = await cache.getMany<Progress | null>([cacheKey.rankingProgress()]);
  const progress: Progress = saved ?? { startedAt: new Date(started).toISOString(), entries: {}, failed: [] };
  const pending = projects.filter((p) => !progress.entries[p.id] && !progress.failed.includes(p.id));
  const processed: string[] = [];

  while (pending.length > 0 && now() - started < budgetMs) {
    const wave = pending.splice(0, WAVE_SIZE);
    const results = await Promise.all(
      wave.map((project) =>
        computeRankingEntry(project).catch((error) => {
          console.error(`[ranking] ${project.id} failed:`, error);
          return null;
        }),
      ),
    );
    wave.forEach((project, i) => {
      const entry = results[i];
      if (entry) progress.entries[project.id] = entry;
      else progress.failed.push(project.id);
      processed.push(project.id);
    });
    await cache.setMany([{ key: cacheKey.rankingProgress(), value: progress, ttl: PROGRESS_TTL }]);
  }

  const remaining = pending.map((p) => p.id);
  if (remaining.length > 0) return { done: false, processed, remaining, elapsedMs: now() - started };

  // Projects that failed this time keep their last good entry, if there is one.
  const previous = await getRankingSnapshot();
  const carried = (previous?.entries ?? []).filter((e) => progress.failed.includes(e.id));
  const failed = progress.failed.filter((id) => !carried.some((e) => e.id === id));
  const snapshot = buildSnapshot([...Object.values(progress.entries), ...carried], failed, new Date(now()));
  await cache.setMany([
    { key: cacheKey.ranking(), value: snapshot, ttl: SNAPSHOT_TTL },
    // Clear progress so the next run starts fresh.
    { key: cacheKey.rankingProgress(), value: null, ttl: 1 },
  ]);
  return { done: true, processed, remaining, elapsedMs: now() - started, snapshot };
}
