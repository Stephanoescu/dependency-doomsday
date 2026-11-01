import { describe, expect, it } from "vitest";
import { capItems, MORE_ID, squarify, type TreemapItem, type TreemapRect } from "./treemap";

const items = (...values: number[]): TreemapItem[] => values.map((value, i) => ({ id: `p${i}`, value }));
const area = (r: TreemapRect) => r.w * r.h;
const EPS = 1e-6;

function overlaps(a: TreemapRect, b: TreemapRect) {
  return a.x + a.w > b.x + EPS && b.x + b.w > a.x + EPS && a.y + a.h > b.y + EPS && b.y + b.h > a.y + EPS;
}

describe("squarify", () => {
  const values = [9, 7, 6, 4, 2, 2, 1, 1, 1, 0.5];
  const rects = squarify(items(...values), 390, 480);

  it("gives every item an area proportional to its value", () => {
    const total = values.reduce((a, b) => a + b, 0);
    for (const r of rects) {
      const value = values[Number(r.id.slice(1))];
      expect(area(r)).toBeCloseTo((value / total) * 390 * 480, 6);
    }
  });

  it("fills the container exactly, without overlaps or overflow", () => {
    expect(rects.reduce((sum, r) => sum + area(r), 0)).toBeCloseTo(390 * 480, 6);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(-EPS);
      expect(r.y).toBeGreaterThanOrEqual(-EPS);
      expect(r.x + r.w).toBeLessThanOrEqual(390 + EPS);
      expect(r.y + r.h).toBeLessThanOrEqual(480 + EPS);
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) expect(overlaps(rects[i], rects[j])).toBe(false);
    }
  });

  it("keeps tiles reasonably square", () => {
    const even = squarify(items(...Array.from({ length: 36 }, () => 1)), 390, 480);
    for (const r of even) expect(Math.max(r.w / r.h, r.h / r.w)).toBeLessThan(3);
  });

  it("puts the largest tile first, at the top-left", () => {
    expect(squarify(items(1, 5, 3), 100, 100)[0]).toMatchObject({ id: "p1", x: 0, y: 0 });
  });

  it("handles a single item, empty input and zero values", () => {
    expect(squarify(items(3), 200, 100)).toEqual([{ id: "p0", x: 0, y: 0, w: 200, h: 100 }]);
    expect(squarify([], 200, 100)).toEqual([]);
    expect(squarify(items(0, 0), 200, 100)).toEqual([]);
    expect(squarify(items(1, 0), 200, 100).map((r) => r.id)).toEqual(["p0"]);
    expect(squarify(items(1), 0, 100)).toEqual([]);
  });
});

describe("capItems", () => {
  it("leaves short lists alone", () => {
    const list = items(3, 2, 1);
    expect(capItems(list, 3)).toEqual({ items: list, hidden: [] });
  });

  it("folds the smallest items into one average-sized tile", () => {
    const { items: capped, hidden } = capItems(items(1, 8, 2, 6, 4), 3);
    expect(capped).toEqual([
      { id: "p1", value: 8 },
      { id: "p3", value: 6 },
      { id: MORE_ID, value: 7 },
    ]);
    expect(hidden).toEqual(["p4", "p2", "p0"]);
  });
});
