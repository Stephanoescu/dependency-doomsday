import { defineConfig } from "@playwright/test";

const PORT = 3200;

/**
 * Browser tests against a production build. They use your installed Chrome
 * (no browser download) and mock /api/*, so npm and GitHub are never called.
 *
 *   npm run test:e2e
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome",
    reducedMotion: "reduce",
  },
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/robots.txt`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
  },
});
