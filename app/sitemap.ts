import type { MetadataRoute } from "next";
import { RANKING_PROJECTS } from "@/lib/ranking";
import { sharePath } from "@/lib/share/links";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/ranking`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/methodology`, changeFrequency: "monthly", priority: 0.6 },
    ...RANKING_PROJECTS.map((p) => ({
      url: `${base}${sharePath({ kind: "repo", ref: p.ref, includeDev: false })}`,
      changeFrequency: "daily" as const,
      priority: 0.4,
    })),
  ];
}
