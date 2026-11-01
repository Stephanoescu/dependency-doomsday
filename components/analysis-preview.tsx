import Link from "next/link";
import type { Ref } from "react";
import { hasData, type AnalysisResult } from "@/lib/analysis/types";
import { describeRule, formatPoints } from "@/lib/explain";
import { formatCompact, formatRelative } from "@/lib/format";
import { fmt, getMessages, plural, type Messages } from "@/lib/i18n";
import { MAX_PACKAGES, type ParseSuccess } from "@/lib/input/types";
import type { RiskLevel, ScoredPackage } from "@/lib/risk";

interface Props {
  parsed: ParseSuccess;
  analysis: AnalysisResult;
  headingRef?: Ref<HTMLHeadingElement>;
}

type Tone = "alarm" | "amber" | "dim" | "green";
const TONE: Record<Tone, string> = {
  alarm: "border-alarm/60 text-alarm",
  amber: "border-amber/50 text-amber",
  dim: "border-line-strong text-fog",
  green: "border-risk-low/50 text-risk-low",
};

const LEVEL_TEXT: Record<RiskLevel, string> = {
  low: "text-risk-low",
  mid: "text-risk-mid",
  high: "text-risk-high",
};

const LEVEL_BORDER: Record<RiskLevel, string> = {
  low: "border-risk-low",
  mid: "border-risk-mid",
  high: "border-risk-high",
};

function tagsFor(pkg: ScoredPackage, t: Messages): { label: string; tone: Tone }[] {
  const tags: { label: string; tone: Tone }[] = [];
  if (pkg.npmStatus === "not-found") tags.push({ label: t.tags.notOnNpm, tone: "alarm" });
  else if (!hasData(pkg)) tags.push({ label: t.tags.noData, tone: "dim" });
  if (pkg.risk?.critical) tags.push({ label: t.tags.critical, tone: "alarm" });
  if (pkg.risk?.possiblyFinished) tags.push({ label: t.tags.possiblyFinished, tone: "green" });
  if (hasData(pkg)) {
    const github: Partial<Record<ScoredPackage["githubStatus"], { label: string; tone: Tone }>> = {
      "not-github": { label: t.tags.notGithub, tone: "dim" },
      "not-found": { label: t.tags.repoNotFound, tone: "amber" },
      "rate-limited": { label: t.tags.githubLimit, tone: "dim" },
      error: { label: t.tags.githubError, tone: "dim" },
    };
    const tag = github[pkg.githubStatus];
    if (tag) tags.push(tag);
    if (pkg.risk?.npmDataOnly) tags.push({ label: t.tags.npmDataOnly, tone: "dim" });
  }
  return tags;
}

function factsFor(pkg: ScoredPackage, t: Messages, now: number): string[] {
  const facts: string[] = [];
  const { npm, github } = pkg;
  if (npm) {
    facts.push(plural(t.facts.maintainers, npm.maintainers.length));
    if (npm.lastPublishAt) {
      facts.push(fmt(t.facts.lastRelease, { time: formatRelative(npm.lastPublishAt, now) }));
    }
  }
  if (pkg.downloads !== null) facts.push(fmt(t.facts.downloads, { count: formatCompact(pkg.downloads) }));
  if (github) {
    if (github.pushedAt) facts.push(fmt(t.facts.pushed, { time: formatRelative(github.pushedAt, now) }));
    facts.push(fmt(t.facts.stars, { count: formatCompact(github.stars) }));
    facts.push(plural(t.facts.issues, github.openIssues));
  }
  return facts;
}

/** Riskiest first; packages without data last. */
function byRisk(a: ScoredPackage, b: ScoredPackage): number {
  return (b.risk?.risk ?? -1) - (a.risk?.risk ?? -1);
}

/**
 * Temporary view until the Phase 4 result page: the forecast numbers plus
 * the evidence and rules behind every package's risk.
 */
export function AnalysisPreview({ parsed, analysis, headingRef }: Props) {
  const t = getMessages();
  const { skipped, truncated, projectName } = parsed;
  const { forecast } = analysis;
  const now = Date.parse(analysis.generatedAt);
  const packages = [...analysis.packages].sort(byRisk);

  return (
    <section className="animate-rise border border-line bg-ash/70">
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5 font-mono text-[11px] tracking-[0.2em] text-dim uppercase">
        <p>{t.preview.title}</p>
        <Link href="/methodology" className="text-fog underline-offset-4 hover:text-bone hover:underline">
          {fmt(t.forecast.methodology, { version: forecast.methodology })}
        </Link>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <div>
          <h2 ref={headingRef} tabIndex={-1} className="font-mono text-xs tracking-[0.2em] text-fog uppercase">
            {t.forecast.scoreLabel}
            {projectName && <span className="text-dim"> · {projectName}</span>}
          </h2>
          {forecast.score !== null && forecast.level && forecast.minutesToMidnight !== null ? (
            <>
              <p className={`mt-2 font-display text-7xl tabular-nums sm:text-8xl ${LEVEL_TEXT[forecast.level]}`}>
                {forecast.score}
                <span className="font-mono text-2xl font-normal tracking-normal text-dim">{t.forecast.outOf}</span>
              </p>
              <p className="mt-2 font-mono text-sm text-bone">
                {plural(t.forecast.minutes, forecast.minutesToMidnight)} ·{" "}
                {plural(t.preview.analyzed, analysis.packages.length)}
              </p>
            </>
          ) : (
            <p className="mt-2 text-fog">{t.forecast.noScore}</p>
          )}
        </div>

        <ul className="space-y-2 text-sm">
          {forecast.critical > 0 && (
            <li className="border-l-2 border-alarm pl-3 text-bone">{plural(t.forecast.critical, forecast.critical)}</li>
          )}
          {forecast.npmDataOnly > 0 && (
            <li className="border-l-2 border-line-strong pl-3 text-fog">
              {plural(t.forecast.npmDataOnly, forecast.npmDataOnly)}
            </li>
          )}
          {forecast.unscored > 0 && (
            <li className="border-l-2 border-line-strong pl-3 text-fog">
              {plural(t.preview.noData, forecast.unscored)}
            </li>
          )}
          {truncated > 0 && (
            <li className="border-l-2 border-amber pl-3 text-amber">
              {plural(t.preview.truncated, truncated, { max: MAX_PACKAGES })}
            </li>
          )}
        </ul>

        <ul className="divide-y divide-line border-y border-line">
          {packages.map((pkg, i) => {
            const tags = tagsFor(pkg, t);
            const facts = factsFor(pkg, t, now);
            const { risk } = pkg;
            return (
              <li
                key={pkg.name}
                style={{ animationDelay: `${Math.min(i * 18, 900)}ms` }}
                className="animate-rise flex gap-3 py-3"
              >
                <div
                  className={`flex w-12 shrink-0 flex-col items-center justify-center border-l-4 bg-ash-2 py-1 ${
                    risk ? LEVEL_BORDER[risk.level] : "border-line-strong"
                  }`}
                >
                  <span
                    className={`font-mono text-lg font-semibold tabular-nums ${risk ? LEVEL_TEXT[risk.level] : "text-dim"}`}
                  >
                    {risk ? risk.risk : "—"}
                  </span>
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
                      <span className="font-mono text-xs text-dim">
                        ({fmt(t.preview.aliasOf, { alias: pkg.alias })})
                      </span>
                    )}
                    {tags.map((tag) => (
                      <span
                        key={tag.label}
                        className={`border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase ${TONE[tag.tone]}`}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                  {risk && risk.rules.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 font-mono text-xs">
                      {risk.rules.map((rule) => (
                        <li key={rule.id} className="flex gap-2">
                          <span className="w-9 shrink-0 text-right text-amber tabular-nums">
                            {formatPoints(rule.points)}
                          </span>
                          <span className="text-bone">{describeRule(rule, t)}</span>
                        </li>
                      ))}
                      {risk.rules.reduce((sum, rule) => sum + rule.points, 0) > risk.risk && (
                        <li className="flex gap-2">
                          <span className="w-9 shrink-0" />
                          <span className="text-dim">{fmt(t.rules.capped, { max: risk.risk })}</span>
                        </li>
                      )}
                    </ul>
                  )}
                  {facts.length > 0 && (
                    <p className="mt-1 font-mono text-xs leading-relaxed text-fog">{facts.join(" · ")}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {skipped.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer font-mono text-xs text-fog marker:text-dim hover:text-bone">
              {plural(t.preview.skipped, skipped.length)}
            </summary>
            <ul className="mt-3 space-y-1 font-mono text-xs">
              {skipped.map((s) => (
                <li key={`${s.field}:${s.name}`} className="flex flex-wrap gap-x-2">
                  <span className="text-bone">{s.name}</span>
                  <span className="text-dim">— {t.skipReasons[s.reason]}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <p className="border-t border-line pt-4 font-mono text-xs leading-relaxed text-dim">{t.preview.pending}</p>
      </div>
    </section>
  );
}
