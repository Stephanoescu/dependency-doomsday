import type { MetadataRoute } from "next";
import { getMessages } from "@/lib/i18n";

export default function manifest(): MetadataRoute.Manifest {
  const t = getMessages();
  return {
    name: t.brand.name,
    short_name: t.brand.short,
    description: t.meta.description,
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
