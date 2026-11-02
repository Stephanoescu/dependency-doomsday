import { describe, expect, it } from "vitest";
import type { RankingHero } from "@/lib/ranking";
import { emphasisWords, rankingImageHeroes } from "./share-image";

describe("emphasisWords", () => {
  it("keeps emphasized parts inside their words so lines break only between words", () => {
    expect(emphasisWords("dependency (**once**, 664.5M) has **a single** maintainer.")).toEqual([
      [{ text: "dependency", strong: false }],
      [
        { text: "(", strong: false },
        { text: "once", strong: true },
        { text: ",", strong: false },
      ],
      [{ text: "664.5M)", strong: false }],
      [{ text: "has", strong: false }],
      [{ text: "a", strong: true }],
      [{ text: "single", strong: true }],
      [{ text: "maintainer.", strong: false }],
    ]);
  });

  it("keeps project paths up to 34 characters whole", () => {
    expect(emphasisWords("vercel/next.js/packages/next: its")[0]).toEqual([
      { text: "vercel/next.js/packages/next:", strong: false },
    ]);
  });

  it("shortens package names too long to wrap", () => {
    const [[piece]] = emphasisWords(`**@acme/${"x".repeat(60)}**`);
    expect(piece.text.length).toBeLessThanOrEqual(34);
    expect(piece.text).toContain("…");
  });
});

describe("rankingImageHeroes", () => {
  const hero = (user: string, projects: number, pkg?: { name: string; downloads: number | null }): RankingHero => ({
    user,
    packages: pkg ? [{ ...pkg, critical: true }] : [],
    projects: Array.from({ length: projects }, (_, i) => `acme/p${i}`),
    support: { kind: "npm-profile", url: `https://www.npmjs.com/~${user}` },
  });

  it("keeps the top three heroes, with their most downloaded package", () => {
    const heroes = rankingImageHeroes([
      hero("isaacs", 4, { name: "minimatch", downloads: 3_000_000_000 }),
      hero("sindresorhus", 3, { name: "supports-color", downloads: 2_200_000_000 }),
      hero("ai", 1, { name: "postcss", downloads: null }),
      hero("nzakas", 1, { name: "@humanfs/node", downloads: 1 }),
    ]);
    expect(heroes).toEqual([
      { user: "isaacs", projects: "4 projects rely on them", topPackage: "minimatch · 3B/month" },
      { user: "sindresorhus", projects: "3 projects rely on them", topPackage: "supports-color · 2.2B/month" },
      { user: "ai", projects: "1 project relies on them", topPackage: "postcss" },
    ]);
  });

  it("shortens names that would overflow a card", () => {
    const [h] = rankingImageHeroes([hero("x".repeat(40), 2, { name: `@acme/${"y".repeat(40)}`, downloads: null })]);
    expect(h.user.length).toBeLessThanOrEqual(18);
    expect(h.topPackage.length).toBeLessThanOrEqual(24);
  });
});
