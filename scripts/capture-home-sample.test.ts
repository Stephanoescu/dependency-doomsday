/**
 * Refreshes lib/home-sample.json — the frozen expressjs/express forecast shown
 * on the home page. Skipped by `npm test`; run `npm run sample:capture`
 * (with GitHub quota left, ideally GITHUB_TOKEN set, so the data is complete).
 */
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { HomeSample } from "@/lib/home-sample";
import { getMessages } from "@/lib/i18n";
import { findHeadline, sentences, writeFinding } from "@/lib/narrative";
import { sharePath, type ShareSource } from "@/lib/share/links";
import { analyzePackages } from "@/lib/server/analyze";
import { resolveSource } from "@/lib/server/forecast";

describe.runIf(import.meta.env.MODE === "capture")("capture home sample", () => {
  it("analyzes expressjs/express", { timeout: 60_000 }, async () => {
    const source: ShareSource = { kind: "repo", ref: { owner: "expressjs", repo: "express" }, includeDev: false };
    const resolved = await resolveSource(source);
    if (!resolved.ok) throw new Error(resolved.error);
    const result = await analyzePackages(resolved.deps);
    const { forecast, packages } = result;
    expect(forecast.score).not.toBeNull();
    expect(result.packages.filter((p) => p.githubStatus === "rate-limited")).toHaveLength(0);

    const t = getMessages();
    const sample: HomeSample = {
      label: resolved.label!,
      path: sharePath(source),
      generatedAt: result.generatedAt,
      score: forecast.score!,
      minutesToMidnight: forecast.minutesToMidnight!,
      level: forecast.level!,
      headline: writeFinding(findHeadline(packages, forecast), t.og.headline, { project: resolved.label! }),
      sentences: sentences(packages, forecast, t),
      tiles: packages.map((p) => ({
        name: p.name,
        risk: p.risk?.risk ?? null,
        level: p.risk?.level ?? null,
        weight: Math.round((p.risk?.weight ?? 1) * 100) / 100,
        critical: p.risk?.critical ?? false,
      })),
    };
    writeFileSync(new URL("../lib/home-sample.json", import.meta.url), `${JSON.stringify(sample, null, 2)}\n`);
  });
});
