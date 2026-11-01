import { GitHubQuotaNotice } from "@/components/github-quota-notice";
import { MonorepoHint } from "@/components/monorepo-hint";
import type { AnalysisResult } from "@/lib/analysis/types";
import { getMessages, plural } from "@/lib/i18n";
import { MAX_PACKAGES, type GitHubRef, type ParseSuccess } from "@/lib/input/types";

interface Props {
  result: AnalysisResult;
  parsed: ParseSuccess & { ref?: GitHubRef };
  onUseMonorepoExample: (url: string) => void;
}

/** Quota, monorepo, truncation, missing data and skipped dependencies. */
export function ResultNotices({ result, parsed, onUseMonorepoExample }: Props) {
  const t = getMessages();
  const rateLimited = result.packages.filter((p) => p.githubStatus === "rate-limited").length;
  return (
    <>
      <GitHubQuotaNotice quota={result.github} skipped={rateLimited} />
      {parsed.monorepo && (
        <MonorepoHint monorepo={parsed.monorepo} githubRef={parsed.ref} onUseExample={onUseMonorepoExample} />
      )}
      {parsed.truncated > 0 && (
        <p className="border-l-2 border-amber pl-3 text-sm text-amber">
          {plural(t.preview.truncated, parsed.truncated, { max: MAX_PACKAGES })}
        </p>
      )}
      {result.forecast.unscored > 0 && (
        <p className="border-l-2 border-line-strong pl-3 text-sm text-fog">
          {plural(t.preview.noData, result.forecast.unscored)}
        </p>
      )}
      {parsed.skipped.length > 0 && (
        <details>
          <summary className="cursor-pointer font-mono text-xs text-fog marker:text-dim hover:text-bone">
            {plural(t.preview.skipped, parsed.skipped.length)}
          </summary>
          <ul className="mt-3 space-y-1 font-mono text-xs">
            {parsed.skipped.map((s) => (
              <li key={`${s.field}:${s.name}`} className="flex flex-wrap gap-x-2">
                <span className="text-bone">{s.name}</span>
                <span className="text-dim">— {t.skipReasons[s.reason]}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
