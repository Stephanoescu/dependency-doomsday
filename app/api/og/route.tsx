import { after } from "next/server";
import { sourceFromParams, sourceLabel, sharePath } from "@/lib/share/links";
import { summaryFor, TIMED_OUT, withDeadline } from "@/lib/server/forecast";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { renderShareImage, type ImageFormat } from "@/lib/server/share-image";

/** Covers the after() work that finishes a slow analysis. 60 s works on Vercel Hobby. */
export const maxDuration = 60;

/** LinkedIn and X give up after a few seconds: answer with the brand card instead of waiting. */
const CRAWLER_BUDGET_MS = 4_000;
/** "Download image" is a person waiting on a button, usually with a warm cache. */
const DOWNLOAD_BUDGET_MS = 25_000;

const CACHE = {
  forecast: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  brand: "public, max-age=86400, s-maxage=604800",
  /** Short, so the CDN asks again once the analysis has finished. */
  pending: "public, max-age=0, s-maxage=60",
};

/**
 * Share image for a forecast: ?repo=owner/repo[&ref=…&path=…&dev=1] or ?d=<lz list>,
 * &format=wide (1200×630, default) or story (1080×1920), &download=1 to wait longer.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const format: ImageFormat = params.get("format") === "story" ? "story" : "wide";
  const download = params.get("download") === "1";
  const source = sourceFromParams(params);
  const host = url.host;

  if (!source) {
    return renderShareImage({ summary: null, format, url: host }, { "Cache-Control": CACHE.brand });
  }

  const shownUrl = `${host}${sharePath(source).split("?")[0]}`.slice(0, 70);
  const label = sourceLabel(source);
  const pending = () =>
    renderShareImage({ summary: null, format, url: shownUrl, label }, { "Cache-Control": CACHE.pending });

  if (!(await rateLimit("image", clientIp(request))).ok) return pending();

  const work = summaryFor(source);
  const outcome = await withDeadline(work, download ? DOWNLOAD_BUDGET_MS : CRAWLER_BUDGET_MS);
  if (outcome === TIMED_OUT) {
    // Let it finish so the crawler's retry (or the next visitor) gets the real image.
    after(() => work.then(() => undefined, () => undefined));
    return pending();
  }
  if (!outcome.ok) return pending();

  const headers: Record<string, string> = { "Cache-Control": CACHE.forecast };
  if (download) {
    const name = `doomsday-${(label ?? "project").replace(/[^\w.-]+/g, "-")}-${format === "story" ? "story" : "1200x630"}.png`;
    headers["Content-Disposition"] = `attachment; filename="${name}"`;
  }
  return renderShareImage({ summary: outcome.summary, format, url: shownUrl }, headers);
}
