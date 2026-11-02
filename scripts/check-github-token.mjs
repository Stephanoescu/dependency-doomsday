/**
 * Confirms GITHUB_TOKEN is loaded (from .env.local etc., exactly as Next.js
 * loads it) and that GitHub grants 5,000 requests/hour instead of 60.
 * Never prints the token.   npm run check:token
 */
import nextEnv from "@next/env";

const { loadedEnvFiles } = nextEnv.loadEnvConfig(process.cwd(), false);
console.log(`Env files loaded: ${loadedEnvFiles.map((f) => f.path).join(", ") || "(none — create .env.local)"}`);

const token = process.env.GITHUB_TOKEN?.trim();
console.log(`GITHUB_TOKEN: ${token ? `set (${token.length} characters)` : "NOT SET"}`);

const res = await fetch("https://api.github.com/rate_limit", {
  headers: {
    "User-Agent": "dependency-doomsday",
    Accept: "application/vnd.github+json",
    ...(token && { Authorization: `Bearer ${token}` }),
  },
});
if (res.status === 401) {
  console.log("GitHub rejected the token (401): it's expired, revoked or mistyped.");
  process.exit(1);
}
const { limit, remaining, reset } = (await res.json()).resources.core;
console.log(`GitHub core limit: ${limit}/hour, ${remaining} left, resets ${new Date(reset * 1000).toLocaleTimeString()}`);
if (limit >= 5000) {
  console.log("OK: authenticated.");
} else {
  console.log("Unauthenticated (60/hour). Add GITHUB_TOKEN=<token> to .env.local and restart the server.");
  process.exit(1);
}
