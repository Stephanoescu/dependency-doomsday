import type { Ref } from "react";
import { hasData, type AnalysisResult, type PackageData } from "@/lib/analysis/types";
import { formatCompact, formatRelative } from "@/lib/format";
import { fmt, getMessages, plural, type Messages } from "@/lib/i18n";
import { MAX_PACKAGES, type ParseSuccess } from "@/lib/input/types";

interface Props {
  parsed: ParseSuccess;
  analysis: AnalysisResult;
  headingRef?: Ref<HTMLHeadingElement>;
}

type Tone = "alarm" | "amber" | "dim";
const TONE: Record<Tone, string> = {
  alarm: "border-alarm/60 text-alarm",
  amber: "border-amber/50 text-amber",
  dim: "border-line-strong text-fog",
};

function tagsFor(pkg: PackageData, t: Messages): { label: string; tone: Tone }[] {
  const tags: { label: string; tone: Tone }[] = [];
  if (pkg.npmStatus === "not-found") tags.push({ label: t.tags.notOnNpm, tone: "alarm" });
  else if (!hasData(pkg)) tags.push({ label: t.tags.noData, tone: "dim" });
  if (pkg.npm?.unpublished) tags.push({ label: t.tags.unpublished, tone: "alarm" });
  if (pkg.npm?.deprecated) tags.push({ label: t.tags.deprecated, tone: "alarm" });
  if (pkg.github?.archived) tags.push({ label: t.tags.archived, tone: "alarm" });
  if (hasData(pkg)) {
    const github: Partial<Record<PackageData["githubStatus"], { label: string; tone: Tone }>> = {
      "no-repo": { label: t.tags.noRepo, tone: "amber" },
      "not-github": { label: t.tags.notGithub, tone: "dim" },
      "not-found": { label: t.tags.repoNotFound, tone: "amber" },
      "rate-limited": { label: t.tags.githubLimit, tone: "dim" },
      error: { label: t.tags.githubError, tone: "dim" },
    };
    const tag = github[pkg.githubStatus];
    if (tag) tags.push(tag);
  }
  return tags;
}

function factsFor(pkg: PackageData, t: Messages, now: number): string[] {
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

/** Temporary Phase 2 view: the raw evidence each package will be scored from. */
export function AnalysisPreview({ parsed, analysis, headingRef }: Props) {
  const t = getMessages();
  const { skipped, truncated, projectName } = parsed;
  const now = Date.parse(analysis.generatedAt);
  const noData = analysis.packages.filter((p) => !hasData(p)).length;

  return (
    <section className="animate-rise border border-line bg-ash/70">
      <p className="border-b border-line px-4 py-2.5 font-mono text-[11px] tracking-[0.2em] text-dim uppercase">
        {t.preview.title}
      </p>

      <div className="space-y-5 p-4 sm:p-5">
        <div>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-3xl text-balance sm:text-4xl"
          >
            {plural(t.preview.analyzed, analysis.packages.length)}
          </h2>
          {projectName && (
            <p className="mt-2 font-mono text-sm text-fog">
              {fmt(t.preview.project, { name: projectName })}
            </p>
          )}
        </div>

        {truncated > 0 && (
          <p className="border-l-2 border-amber pl-3 text-sm text-amber">
            {plural(t.preview.truncated, truncated, { max: MAX_PACKAGES })}
          </p>
        )}
        {noData > 0 && (
          <p className="border-l-2 border-line-strong pl-3 text-sm text-fog">
            {plural(t.preview.noData, noData)}
          </p>
        )}

        <ul className="divide-y divide-line border-y border-line">
          {analysis.packages.map((pkg, i) => {
            const tags = tagsFor(pkg, t);
            const facts = factsFor(pkg, t, now);
            return (
              <li
                key={pkg.name}
                style={{ animationDelay: `${Math.min(i * 18, 900)}ms` }}
                className="animate-rise py-3"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <span className="font-mono text-sm font-semibold break-all text-bone">
                    {pkg.name}
                  </span>
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
                {facts.length > 0 && (
                  <p className="mt-1 font-mono text-xs leading-relaxed text-fog">
                    {facts.join(" · ")}
                  </p>
                )}
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

        <p className="border-t border-line pt-4 font-mono text-xs leading-relaxed text-dim">
          {t.preview.pending}
        </p>
      </div>
    </section>
  );
}
