import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Keep the dev badge away from the input controls on small screens.
  devIndicators: { position: "top-right" },
  // Metadata here only depends on the URL, so it's free to put it in <head> for
  // everyone (not just bots): Lighthouse and every link-preview crawler see it.
  htmlLimitedBots: /.*/,
  // Share images read their fonts from disk at request time.
  outputFileTracingIncludes: {
    "/api/og": ["./assets/fonts/*.ttf"],
    "/opengraph-image": ["./assets/fonts/*.ttf"],
    "/methodology/opengraph-image": ["./assets/fonts/*.ttf"],
    "/ranking/opengraph-image": ["./assets/fonts/*.ttf"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
