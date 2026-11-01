import { formatMonths } from "@/lib/format";
import { fmt, type Messages } from "@/lib/i18n";
import type { AppliedRule } from "@/lib/risk";

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
