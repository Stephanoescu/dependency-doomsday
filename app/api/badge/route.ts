import { after } from "next/server";
import { BADGE_COLORS, badgeSvg } from "@/lib/badge";
import { getMessages } from "@/lib/i18n";
import { sourceFromParams } from "@/lib/share/links";
import { summaryFor, TIMED_OUT, withDeadline } from "@/lib/server/forecast";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

/** Covers the after() work that finishes a slow analysis. 60 s works on Vercel Hobby. */
export const maxDuration = 60;

/** GitHub's image proxy (camo) gives up after a few seconds too. */
const BUDGET_MS = 4_000;

const CACHE = {
  score: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  pending: "public, max-age=0, s-maxage=60",
  error: "public, max-age=300, s-maxage=3600",
};

function svg(message: string, color: string, cacheControl: string, status = 200) {
  return new Response(badgeSvg(message, color), {
    status,
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": cacheControl },
  });
}

/** README badge for a GitHub repo: /api/badge?repo=owner/repo[&ref=…&path=…]. Lists aren't supported. */
export async function GET(request: Request) {
  const b = getMessages().badge;
  const source = sourceFromParams(new URL(request.url).searchParams);
  if (!source || source.kind !== "repo") return svg(b.invalid, BADGE_COLORS.neutral, CACHE.error, 400);

  if (!(await rateLimit("image", clientIp(request))).ok) return svg(b.pending, BADGE_COLORS.neutral, CACHE.pending);

  const work = summaryFor(source);
  const outcome = await withDeadline(work, BUDGET_MS);
  if (outcome === TIMED_OUT) {
    after(() => work.then(() => undefined, () => undefined));
    return svg(b.pending, BADGE_COLORS.neutral, CACHE.pending);
  }
  if (!outcome.ok) {
    const message = outcome.error === "repo-not-found" ? b.notFound : outcome.error === "package-json-not-found" ? b.noPackageJson : b.pending;
    return svg(message, BADGE_COLORS.neutral, message === b.pending ? CACHE.pending : CACHE.error);
  }

  const { summary } = outcome;
  if (summary.state === "insufficient" || summary.score === null || !summary.level) {
    return svg(b.noData, BADGE_COLORS.neutral, CACHE.pending);
  }
  return svg(`${summary.score}/100`, BADGE_COLORS[summary.level], CACHE.score);
}
