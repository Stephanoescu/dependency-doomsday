import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // Share images, badges and the cron are not pages; pasted lists are personal.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/list"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
