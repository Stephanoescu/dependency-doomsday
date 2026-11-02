import { describe, expect, it } from "vitest";
import { forecast } from "@/lib/risk";
import { NOW, pkg } from "@/lib/test/packages";
import { orderEntries, RANKING_PROJECTS, rankingHeroes, soloPackagesOf, type RankingEntry } from "./ranking";

const profile = (user: string) => `https://www.npmjs.com/~${user}`;

function entry(label: string, solo: RankingEntry["soloPackages"], score: number | null = 70): RankingEntry {
  return {
    id: label,
    category: "library",
    label,
    path: `/r/github/${label}`,
    state: score === null ? "insufficient" : "scored",
    score,
    minutesToMidnight: score === null ? null : Math.max(1, Math.round(score / 10)),
    level: score === null ? null : "low",
    finding: { kind: "watch", count: 0 },
    total: 10,
    critical: solo.filter((s) => s.critical).length,
    soloPackages: solo,
  };
}

const solo = (name: string, maintainer: string, downloads = 1_000, critical = false, funding: string | null = null) => ({
  name,
  maintainer,
  downloads,
  critical,
  funding: funding ? { url: funding, type: null } : null,
});

describe("RANKING_PROJECTS", () => {
  it("has 10 distinct projects across categories", () => {
    expect(RANKING_PROJECTS).toHaveLength(10);
    expect(new Set(RANKING_PROJECTS.map((p) => p.id)).size).toBe(10);
    expect(new Set(RANKING_PROJECTS.map((p) => p.category)).size).toBeGreaterThanOrEqual(4);
  });
});

describe("soloPackagesOf", () => {
  it("keeps scored single-maintainer packages with their funding", () => {
    const { packages } = forecast(
      [
        pkg({ npm: { name: "solo", maintainers: ["ann"], funding: [{ url: "https://github.com/sponsors/ann", type: "github" }] }, downloads: 5_000_000 }),
        pkg({ npm: { name: "team", maintainers: ["a", "b"] } }),
      ],
      NOW,
    );
    expect(soloPackagesOf(packages)).toEqual([
      {
        name: "solo",
        maintainer: "ann",
        downloads: 5_000_000,
        critical: true,
        funding: { url: "https://github.com/sponsors/ann", type: "github" },
      },
    ]);
  });
});

describe("rankingHeroes", () => {
  it("orders people by how many projects rely on them, then critical packages, then downloads", () => {
    const heroes = rankingHeroes(
      [
        entry("express", [solo("debug", "tj", 300), solo("once", "isaacs", 600, true)]),
        entry("fastify", [solo("once", "isaacs", 600, true), solo("ms", "tj", 900)]),
        entry("vite", [solo("picomatch", "jon", 9_000, true)]),
      ],
      profile,
    );
    expect(heroes.map((h) => [h.user, h.projects, h.packages.map((p) => p.name)])).toEqual([
      ["isaacs", ["express", "fastify"], ["once"]],
      ["tj", ["express", "fastify"], ["ms", "debug"]],
      ["jon", ["vite"], ["picomatch"]],
    ]);
  });

  it("links to funding when any of their packages declares it, else to their npm profile", () => {
    const heroes = rankingHeroes(
      [entry("x", [solo("p1", "ann", 2, false), solo("p2", "ann", 1, false, "https://opencollective.com/ann"), solo("p3", "bob")])],
      profile,
    );
    const a = heroes.find((h) => h.user === "ann")!;
    const b = heroes.find((h) => h.user === "bob")!;
    expect(a.support).toEqual({ kind: "funding", url: "https://opencollective.com/ann" });
    expect(b.support).toEqual({ kind: "npm-profile", url: "https://www.npmjs.com/~bob" });
  });

  it("leaves automation accounts out", () => {
    const heroes = rankingHeroes([entry("x", [solo("@types/node", "types", 9_000_000, true), solo("ms", "tj")])], profile);
    expect(heroes.map((h) => h.user)).toEqual(["tj"]);
  });

  it("caps the list", () => {
    const many = Array.from({ length: 20 }, (_, i) => solo(`p${i}`, `user${i}`));
    expect(rankingHeroes([entry("x", many)], profile)).toHaveLength(8);
  });
});

describe("orderEntries", () => {
  it("puts the closest to midnight first and unscored projects last", () => {
    const ordered = orderEntries([entry("b", [], 80), entry("c", [], null), entry("a", [], 40)]);
    expect(ordered.map((e) => e.label)).toEqual(["a", "b", "c"]);
  });
});
