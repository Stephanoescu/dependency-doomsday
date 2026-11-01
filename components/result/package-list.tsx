import { packageFacts } from "@/lib/explain";
import { fmt, getMessages } from "@/lib/i18n";
import type { ScoredPackage } from "@/lib/risk";
import { PackageTags } from "./package-tags";
import { LEVEL_BORDER, LEVEL_TEXT, LevelGlyph } from "./risk-style";
import { RuleList } from "./rule-list";

/** Every package with its risk, rules and evidence: the text alternative to the treemap. */
export function PackageList({ packages, now }: { packages: ScoredPackage[]; now: number }) {
  const t = getMessages();
  return (
    <ul className="divide-y divide-line border-y border-line">
      {packages.map((pkg) => {
        const { risk } = pkg;
        const facts = packageFacts(pkg, t, now);
        return (
          <li key={pkg.name} className="flex gap-3 py-3">
            <div
              className={`flex w-12 shrink-0 flex-col items-center justify-center gap-0.5 border-l-4 bg-ash-2 py-1 ${
                risk ? `${LEVEL_BORDER[risk.level]} ${LEVEL_TEXT[risk.level]}` : "border-line-strong text-dim"
              }`}
            >
              <LevelGlyph level={risk?.level ?? null} className="size-3" />
              <span className="font-mono text-base font-semibold tabular-nums">{risk ? risk.risk : "—"}</span>
              <span className="sr-only">
                {risk ? `${fmt(t.forecast.risk, { risk: risk.risk })}, ${t.levels[risk.level]}` : t.tags.noData}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className="font-mono text-sm font-semibold break-all text-bone">{pkg.name}</span>
                {pkg.field === "devDependencies" && (
                  <span className="font-mono text-xs text-amber">{t.preview.devTag}</span>
                )}
                {pkg.alias && (
                  <span className="font-mono text-xs text-dim">({fmt(t.preview.aliasOf, { alias: pkg.alias })})</span>
                )}
                <PackageTags pkg={pkg} t={t} />
              </div>
              {risk && risk.rules.length > 0 && <RuleList risk={risk} t={t} className="mt-1.5" />}
              {facts.length > 0 && (
                <p className="mt-1 font-mono text-xs leading-relaxed text-fog">{facts.join(" · ")}</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
