import { fmt, plural, type Messages } from "@/lib/i18n";
import { findHeadline, writeFinding } from "@/lib/narrative";
import type { Forecast, ScoredPackage } from "@/lib/risk";

/** X counts every link as 23 characters. */
const X_LIMIT = 280;
const X_URL_LENGTH = 23;

export interface ShareTexts {
  /** Post text for X, without the link (the intent adds it). */
  x: string;
  /** Full LinkedIn post, link included: LinkedIn can't prefill text, so it's copied. */
  linkedin: string;
  xIntentUrl: string;
  linkedinShareUrl: string;
}

function fitsX(text: string): boolean {
  return text.length + 1 + X_URL_LENGTH <= X_LIMIT;
}

/** Ready-to-post texts: minutes to midnight, the headline in first person, and the link. */
export function shareTexts(packages: ScoredPackage[], forecast: Forecast, url: string, t: Messages): ShareTexts {
  const s = t.share;
  const finding = findHeadline(packages, forecast);
  const minutes = forecast.minutesToMidnight;

  let x: string;
  let linkedin: string;
  if (finding.kind === "insufficient" || minutes === null || forecast.score === null) {
    x = s.generic;
    linkedin = fmt(s.linkedinGeneric, { url });
  } else {
    const lead = plural(s.lead, minutes);
    const full = writeFinding(finding, s.headline);
    const candidates = [`${lead} ${full} ${s.cta}`, `${lead} ${writeFinding(finding, s.headlineShort)} ${s.cta}`, `${lead} ${s.cta}`];
    x = candidates.find(fitsX) ?? candidates.at(-1)!;
    linkedin = fmt(s.linkedinPost, { lead, score: forecast.score, headline: full, url });
  }

  return {
    x,
    linkedin,
    xIntentUrl: `https://x.com/intent/post?text=${encodeURIComponent(x)}&url=${encodeURIComponent(url)}`,
    linkedinShareUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  };
}

/** Markdown for a README: the badge, linking to the live report. */
export function badgeMarkdown(badgeUrl: string, reportUrl: string): string {
  return `[![Dependency Doomsday](${badgeUrl})](${reportUrl})`;
}
