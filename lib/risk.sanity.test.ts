import { describe, expect, it } from "vitest";
import type { PackageData } from "@/lib/analysis/types";
import fixture from "./__fixtures__/real-packages.json";
import { scorePackage, type PackageRisk } from "./risk";

/**
 * Sanity check against real npm + GitHub data frozen in a fixture
 * (refresh with `npm run fixtures:capture`). Scored as of the capture date,
 * so the expectations don't drift as these packages age.
 */
const now = Date.parse(fixture.capturedAt);
const risks = new Map<string, PackageRisk | null>(
  (fixture.packages as PackageData[]).map((pkg) => [pkg.name, scorePackage(pkg, now)]),
);
const risk = (name: string) => {
  const result = risks.get(name);
  if (!result) throw new Error(`${name} is missing from the fixture or has no data`);
  return result;
};

describe("Methodology v1 against real packages", () => {
  it.each(["request", "left-pad"])("%s scores 100", (name) => {
    expect(risk(name).risk).toBe(100);
  });

  it.each(["react", "express", "lodash"])("%s is green or yellow", (name) => {
    expect(risk(name).level).not.toBe("high");
  });

  it("ms is not red", () => {
    expect(risk("ms").level).not.toBe("high");
  });

  it("was captured with full npm and GitHub data", () => {
    expect([...risks.keys()].sort()).toEqual(["express", "left-pad", "lodash", "ms", "react", "request"]);
    for (const [name, r] of risks) expect(r?.npmDataOnly, name).toBe(false);
  });
});
