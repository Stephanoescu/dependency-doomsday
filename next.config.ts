import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Keep the dev badge away from the input controls on small screens.
  devIndicators: { position: "top-right" },
  // Share images read their fonts from disk at request time.
  outputFileTracingIncludes: {
    "/api/og": ["./assets/fonts/*.ttf"],
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
