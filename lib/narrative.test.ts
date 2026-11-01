import { describe, expect, it } from "vitest";
import type { PackageData } from "@/lib/analysis/types";
import { getMessages } from "@/lib/i18n";
import { forecast } from "@/lib/risk";
import { ago, NOW, pkg, type Overrides } from "@/lib/test/packages";
import { headline, heroes, npmProfileUrl, oldestConcerningRelease, resultState, sentences } from "./narrative";

const t = getMessages();

const named = (name: string, o: Overrides = {}) => pkg({ ...o, npm: { name, ...o.npm } });
const noData = (name: string): PackageData => ({ ...named(name), npmStatus: "error", npm: null });

function run(...packages: PackageData[]) {
  const result = forecast(packages, NOW);
  return {
    ...result,
    headline: headline(result.packages, result.forecast, t),
    sentences: sentences(result.packages, result.forecast, t),
    state: resultState(result.forecast, result.packages.length),
  };
}

// Building blocks, named after what makes them stand out.
const healthy = (name: string, downloads = 1_000) => named(name, { downloads });
const critical = (name: string, downloads: number) => named(name, { npm: { maintainers: ["solo"] }, downloads });
const solo = (name: string, downloads: number) => named(name, { npm: { maintainers: ["solo"] }, downloads });
const deprecated = (name: string, downloads = 1_000) => named(name, { npm: { deprecated: "gone" }, downloads });
/** Red: single maintainer + release 50 months ago + no push in 30 months = 85. */
const stale = (name: string, months = 50, downloads = 1_000) =>
  named(name, {
    npm: { maintainers: ["solo"], lastPublishAt: ago(months) },
    github: { pushedAt: ago(30) },
    downloads,
  });
/** Possibly finished but still red: single maintainer, 0 deps, 2 issues, no push in 30 months → 30+20+15+10 = 75. */
const finishedRed = (name: string, months = 100) =>
  named(name, {
    npm: { maintainers: ["solo"], lastPublishAt: ago(months), dependencyCount: 0, repositoryUrl: null },
    github: { openIssues: 2, pushedAt: ago(30) },
    githubStatus: "ok",
  });
/** Yellow without a single maintainer: release 40 months ago, no recent push → 40. */
const oldRelease = (name: string, months = 40) =>
  named(name, { npm: { lastPublishAt: ago(months) }, github: { pushedAt: ago(13) } });

describe("resultState", () => {
  it("is all-clear when every scored package is green", () => {
    expect(run(healthy("a"), healthy("b")).state).toBe("all-clear");
  });

  it("is insufficient when more than half the packages have no data", () => {
    expect(run(noData("a"), noData("b"), healthy("c")).state).toBe("insufficient");
    expect(run(noData("a"), healthy("b")).state).toBe("all-clear");
    expect(run(noData("a")).state).toBe("insufficient");
  });

  it("is scored otherwise", () => {
    expect(run(healthy("a"), solo("b", 10)).state).toBe("scored");
  });
});

describe("headline", () => {
  it("1. names the most-downloaded critical package first", () => {
    const { headline: h } = run(
      deprecated("request", 50_000_000),
      critical("small-critical", 2_000_000),
      critical("lodash", 636_183_624),
    );
    expect(h).toBe(
      "Your most critical dependency (**lodash**, 636.2M downloads/month) is maintained by **1 person**.",
    );
  });

  it("2. then the most-downloaded deprecated, archived or unpublished package", () => {
    expect(run(deprecated("request", 47_000_000), deprecated("tiny", 10), stale("old")).headline).toBe(
      "**request**, one of your dependencies, is **deprecated**.",
    );
    expect(run(named("left-pad", { github: { archived: true } })).headline).toBe(
      "**left-pad**, one of your dependencies, lives in an **archived** repo.",
    );
  });

  it("3. then the riskiest red package, by its top rule", () => {
    expect(run(stale("is-number", 96), solo("popular", 900_000)).headline).toBe(
      "**is-number** hasn't had a release in **8 years**.",
    );
  });

  it("3. ignores possibly-finished packages, even red ones", () => {
    const { headline: h, packages } = run(finishedRed("done-thing"), stale("is-number", 60));
    expect(packages[0].risk).toMatchObject({ level: "high", possiblyFinished: true });
    expect(h).toBe("**is-number** hasn't had a release in **5 years**.");
  });

  it("3. is skipped when only possibly-finished or green packages are left", () => {
    // finishedRed is red but possibly finished; the next priority (single maintainer) takes over.
    const { headline: h } = run(finishedRed("done-thing"), healthy("react", 700_000_000));
    expect(h).toBe("**done-thing** (1K downloads/month) is maintained by **1 person**.");
  });

  it("4. then the most-downloaded single-maintainer package", () => {
    expect(run(solo("a", 10), solo("b", 900_000), healthy("c")).headline).toBe(
      "**b** (900K downloads/month) is maintained by **1 person**.",
    );
  });

  it("falls back to a count of packages to watch", () => {
    expect(run(oldRelease("x"), healthy("y")).headline).toBe(
      "Nothing is on fire, but **1 dependency** needs watching.",
    );
  });

  it("celebrates when everything is green", () => {
    expect(run(healthy("a"), healthy("b")).headline).toBe("**Doomsday postponed.** All 2 dependencies are low risk.");
    expect(run(healthy("a")).headline).toBe("**Doomsday postponed.** Your only dependency is low risk.");
  });

  it("explains instead of scoring when most data is missing", () => {
    expect(run(noData("a"), noData("b"), healthy("c")).headline).toBe(
      "We couldn't get data for **2 of 3** packages, so a score would be misleading.",
    );
  });
});

describe("sentences", () => {
  it("summarizes levels, single maintainers, the oldest release and missing GitHub data", () => {
    const { sentences: s } = run(
      critical("lodash", 600_000_000),
      stale("is-number", 96),
      oldRelease("old-ish", 40),
      healthy("react"),
      named("no-gh", { github: null, githubStatus: "rate-limited" }),
    );
    expect(s).toEqual([
      "5 dependencies checked: 1 high risk, 2 to watch, 2 low risk.",
      "2 hang on a single maintainer — 1 of them critical, with over 1M downloads a month.",
      "The oldest release is 8 years old (is-number).",
      "1 package scored without GitHub data.",
    ]);
  });

  it("leaves out sentences with nothing to say", () => {
    expect(run(healthy("a"), healthy("b")).sentences).toEqual([
      "2 dependencies checked: 0 high risk, 0 to watch, 2 low risk.",
    ]);
  });

  it("uses the single-maintainer wording without critical packages", () => {
    expect(run(solo("a", 10)).sentences[1]).toBe("1 hangs on a single maintainer.");
  });

  it("explains missing data instead of summarizing", () => {
    expect(run(noData("a"), noData("b"), healthy("c")).sentences).toEqual([
      "Only 1 of 3 packages could be checked — npm may be having trouble. Try again in a minute.",
    ]);
  });
});

describe("oldestConcerningRelease", () => {
  it("ignores possibly-finished packages", () => {
    const { packages } = run(finishedRed("ancient", 150), stale("old", 60));
    expect(oldestConcerningRelease(packages)).toEqual({ name: "old", months: 60 });
  });

  it("ignores green packages", () => {
    // Release 20 months ago halved by a recent push: +13, still green.
    const greenButOld = named("quiet", { npm: { lastPublishAt: ago(200) }, github: { pushedAt: ago(1) } });
    const { packages } = run(greenButOld, oldRelease("watched", 40));
    expect(packages[0].risk?.level).toBe("low");
    expect(oldestConcerningRelease(packages)).toEqual({ name: "watched", months: 40 });
  });

  it("is omitted when only possibly-finished or green packages have old releases", () => {
    const greenButOld = named("quiet", { npm: { lastPublishAt: ago(200) }, github: { pushedAt: ago(1) } });
    const { packages, sentences: s } = run(finishedRed("ancient", 150), greenButOld, solo("x", 10));
    expect(oldestConcerningRelease(packages)).toBeNull();
    expect(s.some((line) => line.startsWith("The oldest release"))).toBe(false);
  });
});

describe("heroes", () => {
  it("lists critical, then single-maintainer, then riskiest packages", () => {
    const { packages } = run(
      healthy("react", 700_000_000),
      oldRelease("old-ish"),
      solo("solo-small", 10),
      critical("lodash", 600_000_000),
      solo("solo-big", 900_000),
    );
    expect(heroes(packages).map((h) => h.name)).toEqual(["lodash", "solo-big", "solo-small", "old-ish", "react"]);
  });

  it("supports through funding when declared, otherwise the npm profile", () => {
    const funded = named("funded", {
      npm: { funding: [{ url: "https://github.com/sponsors/someone", type: "github" }] },
    });
    const unfunded = named("unfunded", { npm: { maintainers: ["@weird name"] } });
    const list = heroes(run(funded, unfunded).packages);
    const a = list.find((h) => h.name === "funded")!;
    const b = list.find((h) => h.name === "unfunded")!;
    expect(a.support).toEqual({ kind: "funding", link: { url: "https://github.com/sponsors/someone", type: "github" } });
    expect(b.support).toEqual({ kind: "npm-profile", url: "https://www.npmjs.com/~%40weird%20name", user: "@weird name" });
  });

  it("caps at 6, shows up to 3 maintainers and skips packages without data or maintainers", () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      named(`p${i}`, { npm: { maintainers: ["a", "b", "c", "d", "e"] } }),
    );
    const list = heroes(run(noData("x"), named("nobody", { npm: { maintainers: [] } }), ...many).packages);
    expect(list).toHaveLength(6);
    expect(list[0]).toMatchObject({ maintainers: ["a", "b", "c"], maintainerCount: 5 });
    expect(list.map((h) => h.name)).not.toContain("x");
    expect(list.map((h) => h.name)).not.toContain("nobody");
  });

  it("builds npm profile URLs", () => {
    expect(npmProfileUrl("sindresorhus")).toBe("https://www.npmjs.com/~sindresorhus");
  });
});
