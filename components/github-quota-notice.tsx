import { WarningIcon } from "@/components/icons";
import { GITHUB_LOW_QUOTA, type GitHubQuota } from "@/lib/analysis/types";
import { formatClockTime } from "@/lib/format";
import { fmt, getMessages, plural } from "@/lib/i18n";

interface Props {
  quota: GitHubQuota;
  /** Packages whose GitHub lookup was skipped because of the limit. */
  skipped: number;
}

/** Warns before (and when) GitHub's hourly limit cuts the analysis short. */
export function GitHubQuotaNotice({ quota, skipped }: Props) {
  const t = getMessages();
  const reset = quota.resetAt ? formatClockTime(quota.resetAt) : "—";
  const exhausted = quota.exhausted || skipped > 0;
  const low =
    !quota.authenticated && quota.remaining !== null && quota.remaining <= GITHUB_LOW_QUOTA;
  if (!exhausted && !low) return null;

  return (
    <div
      className={`animate-rise flex gap-3 border p-4 text-sm leading-relaxed ${
        exhausted ? "border-alarm/60 bg-alarm/10" : "border-amber/50 bg-amber/[0.05]"
      }`}
    >
      <WarningIcon
        className={`mt-0.5 size-4 shrink-0 ${exhausted ? "text-alarm" : "text-amber"}`}
      />
      <div className="space-y-1.5">
        <p className="font-semibold text-bone">
          {exhausted ? t.quota.exhaustedTitle : t.quota.lowTitle}
        </p>
        <p className="text-fog">
          {exhausted
            ? plural(t.quota.exhausted, skipped, { reset })
            : fmt(t.quota.low, {
                remaining: quota.remaining ?? 0,
                limit: quota.limit ?? 60,
                reset,
              })}
        </p>
        {!quota.authenticated && <p className="font-mono text-xs text-dim">{t.quota.tokenHint}</p>}
      </div>
    </div>
  );
}
