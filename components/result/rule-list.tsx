import { describeRule, formatPoints, isCapped } from "@/lib/explain";
import { fmt, type Messages } from "@/lib/i18n";
import type { PackageRisk } from "@/lib/risk";

/** The "why": every rule that fired, with its points. */
export function RuleList({ risk, t, className = "" }: { risk: PackageRisk; t: Messages; className?: string }) {
  return (
    <ul className={`space-y-0.5 font-mono text-xs ${className}`}>
      {risk.rules.map((rule) => (
        <li key={rule.id} className="flex gap-2">
          <span className="w-9 shrink-0 text-right text-amber tabular-nums">{formatPoints(rule.points)}</span>
          <span className="text-bone">{describeRule(rule, t)}</span>
        </li>
      ))}
      {isCapped(risk) && (
        <li className="flex gap-2">
          <span className="w-9 shrink-0" />
          <span className="text-dim">{fmt(t.rules.capped, { max: risk.risk })}</span>
        </li>
      )}
    </ul>
  );
}
