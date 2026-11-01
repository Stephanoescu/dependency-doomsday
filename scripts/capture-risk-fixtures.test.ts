/**
 * Refreshes lib/__fixtures__/real-packages.json with live npm + GitHub data.
 * Skipped by `npm test`; run it on purpose with `npm run fixtures:capture`.
 * The sanity test scores these frozen records as of their capture date, so
 * results never drift as packages age.
 */
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzePackages } from "@/lib/server/analyze";

export const FIXTURE_PACKAGES = ["request", "left-pad", "react", "express", "lodash", "ms"];

describe.runIf(import.meta.env.MODE === "capture")("capture risk fixtures", () => {
  it("fetches live data", { timeout: 60_000 }, async () => {
    const result = await analyzePackages(FIXTURE_PACKAGES.map((name) => ({ name, field: "dependencies" })));
    // Keep the raw evidence only; the sanity test does the scoring.
    const packages = result.packages.map((pkg) => {
      const raw: Partial<typeof pkg> = { ...pkg };
      delete raw.risk;
      return raw;
    });
    for (const p of result.packages) {
      expect(p.npmStatus, p.name).toBe("ok");
      expect(p.githubStatus, p.name).toBe("ok");
    }
    const file = new URL("../lib/__fixtures__/real-packages.json", import.meta.url);
    writeFileSync(file, `${JSON.stringify({ capturedAt: result.generatedAt, packages }, null, 2)}\n`);
  });
});
