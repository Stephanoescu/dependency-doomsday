import type { PackageData } from "@/lib/analysis/types";
import { formatCompact, formatMonths, formatRelative } from "@/lib/format";
import { fmt, plural, type Messages } from "@/lib/i18n";
import type { AppliedRule, PackageRisk } from "@/lib/risk";

/** "+20 Last release 4 years ago (halved from 40: possibly finished)". */
export function describeRule(rule: AppliedRule, t: Messages): string {
  switch (rule.id) {
    case "stale-release": {
      const text = fmt(t.rules["stale-release"], { age: formatMonths(rule.months) });
      if (rule.halvedBy.length === 0) return text;
      const reasons = rule.halvedBy.map((reason) => t.rules.halvedBy[reason]).join(", ");
      return `${text} (${fmt(t.rules.halved, { points: rule.basePoints, reasons })})`;
    }
    case "stale-push":
      return fmt(t.rules["stale-push"], { age: formatMonths(rule.months) });
    default:
      return t.rules[rule.id];
  }
}

export function formatPoints(points: number): string {
  return `+${points}`;
}

/** True when the cap at 100 cut some points off. */
export function isCapped(risk: PackageRisk): boolean {
  return risk.rules.reduce((sum, rule) => sum + rule.points, 0) > risk.risk;
}

/** "1 maintainer · released 3 years ago · 12M/month · pushed 2 years ago · 1.3K stars · 10 open issues". */
export function packageFacts(pkg: PackageData, t: Messages, now: number): string[] {
  const facts: string[] = [];
  const { npm, github } = pkg;
  if (npm) {
    facts.push(plural(t.facts.maintainers, npm.maintainers.length));
    if (npm.lastPublishAt) facts.push(fmt(t.facts.lastRelease, { time: formatRelative(npm.lastPublishAt, now) }));
  }
  if (pkg.downloads !== null) facts.push(fmt(t.facts.downloads, { count: formatCompact(pkg.downloads) }));
  if (github) {
    if (github.pushedAt) facts.push(fmt(t.facts.pushed, { time: formatRelative(github.pushedAt, now) }));
    facts.push(fmt(t.facts.stars, { count: formatCompact(github.stars) }));
    facts.push(plural(t.facts.issues, github.openIssues));
  }
  return facts;
}

export function npmPackageUrl(name: string): string {
  return `https://www.npmjs.com/package/${name}`;
}
