import { hasData, type PackageData } from "@/lib/analysis/types";

/**
 * Methodology v1 — fixed, explainable rules. No AI, no hidden weights.
 * Any change to a number below is a new methodology version: bump
 * METHODOLOGY_VERSION and update /methodology (messages/en.ts → methodology).
 */
export const METHODOLOGY_VERSION = 1;

export const RULES = {
  /** Deprecated or unpublished on npm, or the GitHub repo is archived: maximum risk. */
  terminal: 100,
  singleMaintainer: 30,
  releaseOver36Months: 40,
  releaseOver18Months: 25,
  pushOver24Months: 15,
  noRepository: 10,
  /** The release-age penalty is halved (once) by any of the reasons below. */
  halvingFactor: 0.5,
  /** "Possibly finished": fewer open issues than this… */
  finishedMaxOpenIssues: 10,
  /** …or a push to the repo within this many months. */
  recentPushMonths: 12,
  /** Single maintainer and more monthly downloads than this. */
  criticalDownloads: 1_000_000,
  /** Critical packages count double in the project score. */
  criticalWeight: 2,
  maxRisk: 100,
} as const;

export type RiskLevel = "low" | "mid" | "high";

/** Green 0–29, yellow 30–59, red 60–100. */
export function riskLevel(risk: number): RiskLevel {
  if (risk >= 60) return "high";
  if (risk >= 30) return "mid";
  return "low";
}

export type HalvingReason = "possibly-finished" | "recent-push";

/** One line of the "why" behind a package's risk. */
export type AppliedRule =
  | { id: "deprecated" | "unpublished" | "archived" | "single-maintainer" | "no-repo"; points: number }
  | {
      id: "stale-release";
      points: number;
      /** Penalty before halving: 40 (over 36 months) or 25 (over 18 months). */
      basePoints: number;
      /** Whole months since the last release. */
      months: number;
      /** Empty when not halved; it is halved once even if both reasons apply. */
      halvedBy: HalvingReason[];
    }
  | { id: "stale-push"; points: number; months: number };

export interface PackageRisk {
  /** 0–100, capped. */
  risk: number;
  level: RiskLevel;
  /** Every rule that fired, in the order evaluated. Their points add up to `risk` before the cap. */
  rules: AppliedRule[];
  /** Single maintainer and more than 1M downloads a month. */
  critical: boolean;
  /** No dependencies, few open issues, not deprecated/archived, and an old release. */
  possiblyFinished: boolean;
  /** Scored without GitHub data (no repo, other host, not found, limit or error). */
  npmDataOnly: boolean;
  /** Weight in the project score: (1 + log10(downloads + 1)) × 2 if critical. */
  weight: number;
}

export interface ScoredPackage extends PackageData {
  /** null when the package has no npm data and is left out of the score. */
  risk: PackageRisk | null;
}

export interface Forecast {
  methodology: typeof METHODOLOGY_VERSION;
  /** 0–100, higher is healthier: 100 − weighted average risk. null if nothing could be scored. */
  score: number | null;
  /** Color of the project as a whole: the level of (100 − score). */
  level: RiskLevel | null;
  /** max(1, round(score / 10)); null if nothing could be scored. */
  minutesToMidnight: number | null;
  scored: number;
  /** Packages with no npm data, left out of the score. */
  unscored: number;
  /** Scored packages that had no GitHub data. */
  npmDataOnly: number;
  critical: number;
  possiblyFinished: number;
  levels: Record<RiskLevel, number>;
}

const MONTH_MS = (365.25 / 12) * 24 * 3600 * 1000;

/** Fractional months from `iso` to `now`; null for a missing or unparsable date. */
export function monthsSince(iso: string | null, now: number): number | null {
  if (!iso) return null;
  const time = Date.parse(iso);
  return Number.isNaN(time) ? null : (now - time) / MONTH_MS;
}

export function packageWeight(downloads: number | null, critical: boolean): number {
  const base = 1 + Math.log10(Math.max(0, downloads ?? 0) + 1);
  return critical ? base * RULES.criticalWeight : base;
}

/** Applies Methodology v1 to one package. Returns null when it has no npm data. */
export function scorePackage(pkg: PackageData, now: number): PackageRisk | null {
  if (!hasData(pkg) || !pkg.npm) return null;
  const { npm, github } = pkg;
  const rules: AppliedRule[] = [];

  if (npm.deprecated) rules.push({ id: "deprecated", points: RULES.terminal });
  if (npm.unpublished) rules.push({ id: "unpublished", points: RULES.terminal });
  if (github?.archived) rules.push({ id: "archived", points: RULES.terminal });
  const terminal = rules.length > 0;

  const singleMaintainer = npm.maintainers.length === 1;
  if (singleMaintainer) rules.push({ id: "single-maintainer", points: RULES.singleMaintainer });

  const releaseMonths = monthsSince(npm.lastPublishAt, now);
  const pushMonths = github ? monthsSince(github.pushedAt, now) : null;
  let possiblyFinished = false;

  if (releaseMonths !== null && releaseMonths > 18) {
    const basePoints = releaseMonths > 36 ? RULES.releaseOver36Months : RULES.releaseOver18Months;
    const halvedBy: HalvingReason[] = [];

    // Needs GitHub data: without it we can't tell "finished" from "forgotten".
    possiblyFinished =
      !terminal &&
      npm.dependencyCount === 0 &&
      github !== null &&
      github.openIssues < RULES.finishedMaxOpenIssues;
    if (possiblyFinished) halvedBy.push("possibly-finished");
    if (pushMonths !== null && pushMonths < RULES.recentPushMonths) halvedBy.push("recent-push");

    rules.push({
      id: "stale-release",
      points: halvedBy.length > 0 ? Math.round(basePoints * RULES.halvingFactor) : basePoints,
      basePoints,
      months: Math.floor(releaseMonths),
      halvedBy,
    });
  }

  if (pushMonths !== null && pushMonths > 24) {
    rules.push({ id: "stale-push", points: RULES.pushOver24Months, months: Math.floor(pushMonths) });
  }

  if (!npm.repositoryUrl) rules.push({ id: "no-repo", points: RULES.noRepository });

  const risk = Math.min(
    RULES.maxRisk,
    rules.reduce((sum, rule) => sum + rule.points, 0),
  );
  const critical = singleMaintainer && (pkg.downloads ?? 0) > RULES.criticalDownloads;

  return {
    risk,
    level: riskLevel(risk),
    rules,
    critical,
    possiblyFinished,
    npmDataOnly: pkg.githubStatus !== "ok" || github === null,
    weight: packageWeight(pkg.downloads, critical),
  };
}

export function minutesToMidnight(score: number): number {
  return Math.max(1, Math.round(score / 10));
}

/** Project score = 100 − weighted average risk of the packages that have data. */
export function summarize(packages: ScoredPackage[]): Forecast {
  const levels: Record<RiskLevel, number> = { low: 0, mid: 0, high: 0 };
  let weighted = 0;
  let totalWeight = 0;
  let scored = 0;
  let npmDataOnly = 0;
  let critical = 0;
  let possiblyFinished = 0;

  for (const { risk } of packages) {
    if (!risk) continue;
    scored++;
    weighted += risk.risk * risk.weight;
    totalWeight += risk.weight;
    levels[risk.level]++;
    if (risk.npmDataOnly) npmDataOnly++;
    if (risk.critical) critical++;
    if (risk.possiblyFinished) possiblyFinished++;
  }

  const score = totalWeight > 0 ? Math.round(100 - weighted / totalWeight) : null;

  return {
    methodology: METHODOLOGY_VERSION,
    score,
    level: score === null ? null : riskLevel(100 - score),
    minutesToMidnight: score === null ? null : minutesToMidnight(score),
    scored,
    unscored: packages.length - scored,
    npmDataOnly,
    critical,
    possiblyFinished,
    levels,
  };
}

/** Scores every package and the project. `now` is when the data was collected. */
export function forecast(
  packages: PackageData[],
  now: number,
): { packages: ScoredPackage[]; forecast: Forecast } {
  const scoredPackages = packages.map((pkg) => ({ ...pkg, risk: scorePackage(pkg, now) }));
  return { packages: scoredPackages, forecast: summarize(scoredPackages) };
}
