import { hasData } from "@/lib/analysis/types";
import type { Messages } from "@/lib/i18n";
import type { ScoredPackage } from "@/lib/risk";

type Tone = "alarm" | "amber" | "dim" | "green";

const TONE: Record<Tone, string> = {
  alarm: "border-alarm/60 text-alarm",
  amber: "border-amber/50 text-amber",
  dim: "border-line-strong text-fog",
  green: "border-risk-low/50 text-risk-low",
};

export function packageTags(pkg: ScoredPackage, t: Messages): { label: string; tone: Tone }[] {
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

export function PackageTags({ pkg, t }: { pkg: ScoredPackage; t: Messages }) {
  return packageTags(pkg, t).map((tag) => (
    <span
      key={tag.label}
      className={`border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase ${TONE[tag.tone]}`}
    >
      {tag.label}
    </span>
  ));
}
