import { connection } from "next/server";
import { getMessages } from "@/lib/i18n";
import { TIMED_OUT, withDeadline } from "@/lib/server/forecast";
import { getRankingSnapshot } from "@/lib/server/ranking";
import { rankingImageHeroes, renderRankingImage } from "@/lib/server/share-image";
import { siteUrl } from "@/lib/site";

export const alt = getMessages().og.rankingAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** A single cache read; past this, the card goes out with the title and brand only. */
const CACHE_BUDGET_MS = 1_500;

const CACHE = {
  /** The cron refreshes the ranking once a day. */
  heroes: "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400",
  /** Short, so the CDN asks again once the cron has published the ranking. */
  title: "public, max-age=0, s-maxage=300",
};

/**
 * The ranking's share card. It only reads the published snapshot, never
 * computes it: a crawler must get an image within a few seconds.
 */
export default async function OpengraphImage() {
  await connection();
  const snapshot = await withDeadline(getRankingSnapshot().catch(() => null), CACHE_BUDGET_MS);
  const heroes = snapshot && snapshot !== TIMED_OUT ? rankingImageHeroes(snapshot.heroes) : [];
  return renderRankingImage(new URL(siteUrl()).host, heroes, {
    "Cache-Control": heroes.length ? CACHE.heroes : CACHE.title,
  });
}
