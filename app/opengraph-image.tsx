import { getMessages } from "@/lib/i18n";
import { renderHomeImage } from "@/lib/server/share-image";
import { siteUrl } from "@/lib/site";

export const alt = getMessages().og.homeAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The home page's share card, rendered at build time. */
export default async function OpengraphImage() {
  return renderHomeImage(new URL(siteUrl()).host);
}
