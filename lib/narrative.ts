import type { FundingLink } from "@/lib/analysis/types";
import { formatCompact, formatMonths } from "@/lib/format";
import { fmt, plural, type Messages } from "@/lib/i18n";
import type { AppliedRule, Forecast, PackageRisk, ScoredPackage } from "@/lib/risk";

/**
 * Turns a forecast into words, with fixed rules like the score itself.
 * Strings may contain **emphasis** for <RichText>.
 */

export type ResultState = "scored" | "all-clear" | "insufficient";

/** More than half the packages without data (or none scored): a score would mislead. */
export function resultState(forecast: Forecast, total: number): ResultState {
  if (forecast.scored === 0 || forecast.unscored > total / 2) return "insufficient";
  if (forecast.levels.mid === 0 && forecast.levels.high === 0) return "all-clear";
  return "scored";
}

type Scored = ScoredPackage & { risk: PackageRisk };

function scoredOnly(packages: ScoredPackage[]): Scored[] {
  return packages.filter((p): p is Scored => p.risk !== null && p.npm !== null);
}

const byDownloads = (a: ScoredPackage, b: ScoredPackage) => (b.downloads ?? 0) - (a.downloads ?? 0);
const byRiskThenDownloads = (a: Scored, b: Scored) => b.risk.risk - a.risk.risk || byDownloads(a, b);

/** Red or yellow and not "possibly finished": the packages worth naming for age-related findings. */
function isConcerning(p: Scored): boolean {
  return p.risk.level !== "low" && !p.risk.possiblyFinished;
}

const TERMINAL = ["deprecated", "archived", "unpublished"] as const;

/** The rule with the most points; ties keep evaluation order. */
function topRule(risk: PackageRisk): AppliedRule | null {
  return risk.rules.reduce<AppliedRule | null>((top, rule) => (!top || rule.points > top.points ? rule : top), null);
}

function ruleHeadline(p: Scored, rule: AppliedRule, t: Messages): string {
  const h = t.result.headline;
  const name = p.name;
  switch (rule.id) {
    case "stale-release":
      return fmt(h["stale-release"], { name, age: formatMonths(rule.months) });
    case "stale-push":
      return fmt(h["stale-push"], { name, age: formatMonths(rule.months) });
    case "single-maintainer":
      return fmt(h["single-maintainer"], { name, downloads: formatCompact(p.downloads ?? 0) });
    default:
      return fmt(h[rule.id], { name });
  }
}

/**
 * The single worst finding, read first. Priorities:
 * 1. the most-downloaded critical package;
 * 2. the most-downloaded deprecated, archived or unpublished package;
 * 3. the riskiest red package that isn't "possibly finished", by its top rule;
 * 4. the most-downloaded single-maintainer package;
 * then a general line for yellow-only results, all-clear or insufficient data.
 */
export function headline(packages: ScoredPackage[], forecast: Forecast, t: Messages): string {
  const h = t.result.headline;
  const state = resultState(forecast, packages.length);
  if (state === "insufficient") {
    return fmt(h.insufficient, { unscored: forecast.unscored, total: packages.length });
  }
  if (state === "all-clear") return plural(h.allClear, forecast.scored);

  const scored = scoredOnly(packages);

  const critical = scored.filter((p) => p.risk.critical).sort(byDownloads)[0];
  if (critical) {
    return fmt(h.critical, { name: critical.name, downloads: formatCompact(critical.downloads ?? 0) });
  }

  const terminal = scored
    .filter((p) => p.risk.rules.some((r) => (TERMINAL as readonly string[]).includes(r.id)))
    .sort(byDownloads)[0];
  if (terminal) {
    const id = TERMINAL.find((id) => terminal.risk.rules.some((r) => r.id === id))!;
    return fmt(h[id], { name: terminal.name });
  }

  const red = scored.filter((p) => p.risk.level === "high" && isConcerning(p)).sort(byRiskThenDownloads)[0];
  const redRule = red && topRule(red.risk);
  if (red && redRule) return ruleHeadline(red, redRule, t);

  const solo = scored.filter((p) => p.npm?.maintainers.length === 1).sort(byDownloads)[0];
  if (solo) return fmt(h["single-maintainer"], { name: solo.name, downloads: formatCompact(solo.downloads ?? 0) });

  return plural(h.watch, forecast.levels.mid);
}

/** 3–4 sentences with numbers. Each is left out when it has nothing to say. */
export function sentences(packages: ScoredPackage[], forecast: Forecast, t: Messages): string[] {
  const s = t.result.sentences;
  const scored = scoredOnly(packages);
  if (resultState(forecast, packages.length) === "insufficient") {
    return [fmt(s.insufficient, { scored: forecast.scored, total: packages.length })];
  }

  const out: string[] = [
    plural(s.levels, forecast.scored, {
      high: forecast.levels.high,
      mid: forecast.levels.mid,
      low: forecast.levels.low,
    }),
  ];

  const solo = scored.filter((p) => p.npm?.maintainers.length === 1).length;
  if (solo > 0) {
    out.push(
      forecast.critical > 0
        ? plural(s.singleMaintainerCritical, solo, { critical: forecast.critical })
        : plural(s.singleMaintainer, solo),
    );
  }

  const oldest = oldestConcerningRelease(scored);
  if (oldest) out.push(fmt(s.oldest, { name: oldest.name, age: formatMonths(oldest.months) }));

  if (forecast.npmDataOnly > 0) out.push(plural(t.forecast.npmDataOnly, forecast.npmDataOnly));

  return out.slice(0, 4);
}

/** Oldest penalized release, ignoring green and "possibly finished" packages. */
export function oldestConcerningRelease(packages: ScoredPackage[]): { name: string; months: number } | null {
  let oldest: { name: string; months: number } | null = null;
  for (const p of scoredOnly(packages)) {
    if (!isConcerning(p)) continue;
    const rule = p.risk.rules.find((r) => r.id === "stale-release");
    if (rule?.id === "stale-release" && (!oldest || rule.months > oldest.months)) {
      oldest = { name: p.name, months: rule.months };
    }
  }
  return oldest;
}

export interface Hero {
  name: string;
  /** npm usernames, at most 3. */
  maintainers: string[];
  maintainerCount: number;
  downloads: number | null;
  critical: boolean;
  /** Funding link when the package declares one, otherwise the first maintainer's npm profile. */
  support: { kind: "funding"; link: FundingLink } | { kind: "npm-profile"; url: string; user: string } | null;
}

export const MAX_HEROES = 6;

export function npmProfileUrl(user: string): string {
  return `https://www.npmjs.com/~${encodeURIComponent(user)}`;
}

/** Critical first, then single-maintainer, then riskiest; most downloads first within each group. */
export function heroes(packages: ScoredPackage[]): Hero[] {
  const scored = scoredOnly(packages).filter((p) => (p.npm?.maintainers.length ?? 0) > 0);
  const group = (p: Scored) => (p.risk.critical ? 0 : p.npm?.maintainers.length === 1 ? 1 : 2);
  const ordered = [...scored].sort(
    (a, b) => group(a) - group(b) || (group(a) === 2 ? byRiskThenDownloads(a, b) : byDownloads(a, b)),
  );

  return ordered.slice(0, MAX_HEROES).map((p) => {
    const maintainers = p.npm?.maintainers ?? [];
    const funding = p.npm?.funding?.[0];
    return {
      name: p.name,
      maintainers: maintainers.slice(0, 3),
      maintainerCount: maintainers.length,
      downloads: p.downloads,
      critical: p.risk.critical,
      support: funding
        ? { kind: "funding", link: funding }
        : maintainers[0]
          ? { kind: "npm-profile", url: npmProfileUrl(maintainers[0]), user: maintainers[0] }
          : null,
    };
  });
}
